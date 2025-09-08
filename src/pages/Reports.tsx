import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/SessionContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileDown, Users, Target, CheckCircle, Activity, UserPlus, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, Cell } from 'recharts';
import { startOfMonth, endOfMonth, subMonths, startOfToday, endOfToday } from 'date-fns';
import { downloadCSV } from "@/lib/csv";
import { showError, showLoading, dismissToast, showSuccess } from "@/utils/toast";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_COLORS: { [key: string]: string } = {
  'تم التعاقد': 'hsl(var(--success))',
  'لا يرغب': 'hsl(var(--destructive))',
  'متابعة مستمرة': '#f59e0b', // Corresponds to bg-yellow-500
  'تواصل لاحقاً': '#a855f7', // Corresponds to bg-purple-500
  'جديد': 'hsl(var(--accent))',
};

type DateRangeFilter = 'this_month' | 'last_month' | 'last_90_days' | 'all_time';

const getDateRange = (filter: DateRangeFilter): { startDate?: string, endDate?: string } => {
  const now = new Date();
  switch (filter) {
    case 'this_month':
      return { startDate: startOfMonth(now).toISOString(), endDate: endOfToday().toISOString() };
    case 'last_month':
      const lastMonth = subMonths(now, 1);
      return { startDate: startOfMonth(lastMonth).toISOString(), endDate: endOfMonth(lastMonth).toISOString() };
    case 'last_90_days':
      return { startDate: subMonths(now, 3).toISOString(), endDate: endOfToday().toISOString() };
    case 'all_time':
    default:
      return { startDate: undefined, endDate: undefined };
  }
};

const fetchAnalyticsData = async (filter: DateRangeFilter) => {
  const { startDate, endDate } = getDateRange(filter);

  let clientsQuery = supabase.from('clients').select('id, status, created_at');
  if (startDate && endDate) {
    clientsQuery = clientsQuery.gte('created_at', startDate).lte('created_at', endDate);
  }
  const { data: clients, error: clientsError } = await clientsQuery;
  if (clientsError) throw new Error(clientsError.message);

  let followUpsQuery = supabase.from('follow_ups').select('*', { count: 'exact', head: true });
  if (startDate && endDate) {
    followUpsQuery = followUpsQuery.gte('created_at', startDate).lte('created_at', endDate);
  }
  const { count: followUpsCount, error: followUpsError } = await followUpsQuery;
  if (followUpsError) throw new Error(followUpsError.message);

  const totalClients = clients.length;
  const contractedClients = clients.filter(c => c.status === 'تم التعاقد').length;
  const conversionRate = totalClients > 0 ? (contractedClients / totalClients) * 100 : 0;

  const clientsByStatus = clients.reduce((acc, client) => {
    const status = client.status || 'جديد';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const newClients = clientsByStatus['جديد'] || 0;
  const contactLaterClients = clientsByStatus['تواصل لاحقاً'] || 0;

  const chartData = Object.entries(clientsByStatus).map(([name, value]) => ({
    name,
    'عدد العملاء': value,
    fill: STATUS_COLORS[name] || 'hsl(var(--primary))',
  }));

  return {
    totalClients,
    contractedClients,
    conversionRate,
    followUpsThisMonth: followUpsCount || 0,
    chartData,
    newClients,
    contactLaterClients,
  };
};

const ReportsPage = () => {
  const { session } = useSession();
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('this_month');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['analytics', dateFilter],
    queryFn: () => fetchAnalyticsData(dateFilter),
    enabled: !!session?.user?.id,
  });

  const handleExport = async (type: 'clients' | 'follow_ups') => {
    if (!session?.user) return;
    const toastId = showLoading(`جاري تصدير ${type === 'clients' ? 'العملاء' : 'المتابعات'}...`);
    
    const { startDate, endDate } = getDateRange(dateFilter);

    try {
      if (type === 'clients') {
        let query = supabase.from('clients').select('*');
        if (startDate && endDate) {
          query = query.gte('created_at', startDate).lte('created_at', endDate);
        }
        const { data: clients, error } = await query;
        if (error) throw error;
        const headers = [
          { key: 'company_name', label: 'اسم الشركة' },
          { key: 'contact_person', label: 'الشخص المسؤول' },
          { key: 'phone', label: 'الهاتف' },
          { key: 'email', label: 'البريد الإلكتروني' },
          { key: 'address', label: 'العنوان' },
          { key: 'number_of_cars', label: 'عدد السيارات' },
          { key: 'fuel_type', label: 'نوع الوقود' },
          { key: 'status', label: 'الحالة' },
          { key: 'created_at', label: 'تاريخ الإنشاء' },
        ];
        downloadCSV(clients, headers, `clients_export_${dateFilter}`);
      } else {
        const { data: clientsData, error: clientsError } = await supabase.from('clients').select('id, company_name');
        if (clientsError) throw clientsError;
        const clientMap = new Map(clientsData.map(c => [c.id, c.company_name]));

        let query = supabase.from('follow_ups_with_user').select('*');
        if (startDate && endDate) {
          query = query.gte('created_at', startDate).lte('created_at', endDate);
        }
        const { data: followUps, error } = await query;
        if (error) throw error;

        const enrichedFollowUps = followUps.map(f => ({
          ...f,
          company_name: clientMap.get(f.client_id) || 'عميل غير معروف'
        }));

        const headers = [
          { key: 'company_name', label: 'اسم الشركة' },
          { key: 'feedback', label: 'الملاحظات' },
          { key: 'status', label: 'الحالة' },
          { key: 'next_follow_up_date', label: 'تاريخ المتابعة التالية' },
          { key: 'created_at', label: 'تاريخ الإنشاء' },
          { key: 'full_name', label: 'بواسطة' },
        ];
        downloadCSV(enrichedFollowUps, headers, `follow_ups_export_${dateFilter}`);
      }
      showSuccess('تم التصدير بنجاح!');
    } catch (err: any) {
      showError(`فشل التصدير: ${err.message}`);
    } finally {
      dismissToast(toastId);
    }
  };

  return (
    <div dir="rtl" className="container mx-auto p-4 md:p-8">
      <header className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex-1">
            <h1 className="text-2xl font-bold">التقارير والتحليلات</h1>
        </div>
        <div className="flex items-center gap-2">
            <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as DateRangeFilter)}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="اختر نطاق زمني" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="this_month">هذا الشهر</SelectItem>
                    <SelectItem value="last_month">الشهر الماضي</SelectItem>
                    <SelectItem value="last_90_days">آخر 90 يومًا</SelectItem>
                    <SelectItem value="all_time">كل الأوقات</SelectItem>
                </SelectContent>
            </Select>
            <Button asChild variant="outline">
            <Link to="/fleet">
                <ArrowRight className="ml-2 h-4 w-4" />
                العودة
            </Link>
            </Button>
        </div>
      </header>
      
      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      ) : isError ? (
        <Card className="bg-destructive/10 border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">حدث خطأ</CardTitle>
            <CardDescription className="text-destructive">{error.message}</CardDescription>
          </CardHeader>
        </Card>
      ) : data && (
        <main className="space-y-8">
          <section>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي العملاء</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.totalClients}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">العملاء المتعاقد معهم</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.contractedClients}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">معدل التحويل</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.conversionRate.toFixed(1)}%</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">المتابعات</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+{data.followUpsThisMonth}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">عملاء جدد</CardTitle>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.newClients}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">تواصل لاحقاً</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.contactLaterClients}</div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>توزيع العملاء حسب الحالة</CardTitle>
                <CardDescription>
                  نظرة عامة على حالة عملائك الحاليين. إجمالي العملاء: {data.totalClients}
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                    <Tooltip wrapperClassName="!bg-background !border-border" cursor={{ fill: 'hsl(var(--muted))' }} />
                    <Legend />
                    <Bar dataKey="عدد العملاء" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="عدد العملاء" position="top" style={{ fill: 'hsl(var(--foreground))', fontSize: 12 }} />
                      {data.chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </section>

          <Separator />

          <section>
            <Card>
              <CardHeader>
                <CardTitle>تصدير البيانات</CardTitle>
                <CardDescription>قم بتنزيل بيانات العملاء والمتابعات كملف CSV للفترة الزمنية المحددة.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-4">
                <Button onClick={() => handleExport('clients')}>
                  <FileDown className="ml-2 h-4 w-4" />
                  تصدير العملاء
                </Button>
                <Button onClick={() => handleExport('follow_ups')} variant="secondary">
                  <FileDown className="ml-2 h-4 w-4" />
                  تصدير سجل المتابعات
                </Button>
              </CardContent>
            </Card>
          </section>
        </main>
      )}
    </div>
  );
};

export default ReportsPage;