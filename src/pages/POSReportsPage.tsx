import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/SessionContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileDown, Phone, Users, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, Cell } from 'recharts';
import { startOfMonth, endOfMonth, subMonths, startOfToday, endOfToday } from 'date-fns';
import { downloadCSV } from "@/lib/csv";
import { showError, showLoading, dismissToast, showSuccess } from "@/utils/toast";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DEPARTMENT_COLORS: { [key: string]: string } = {
  'تجزئة': '#3b82f6', // blue-500
  'خدمات': '#22c55e', // green-500
  'صناعة': '#a855f7', // purple-500
  'حكومي': '#f97316', // orange-500
  'غير محدد': 'hsl(var(--accent))',
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

const fetchPOSAnalyticsData = async (filter: DateRangeFilter) => {
  const { startDate, endDate } = getDateRange(filter);

  let clientsQuery = supabase.from('pos_clients').select('id, department, created_at');
  if (startDate && endDate) {
    clientsQuery = clientsQuery.gte('created_at', startDate).lte('created_at', endDate);
  }
  const { data: clients, error: clientsError } = await clientsQuery;
  if (clientsError) throw new Error(clientsError.message);

  let callLogsQuery = supabase.from('pos_call_logs').select('*', { count: 'exact', head: true });
  if (startDate && endDate) {
    callLogsQuery = callLogsQuery.gte('created_at', startDate).lte('created_at', endDate);
  }
  const { count: callLogsCount, error: callLogsError } = await callLogsQuery;
  if (callLogsError) throw new Error(callLogsError.message);

  const totalClients = clients.length;
  const clientsByDepartment = clients.reduce((acc, client) => {
    const department = client.department || 'غير محدد';
    acc[department] = (acc[department] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(clientsByDepartment).map(([name, value]) => ({
    name,
    'عدد العملاء': value,
    fill: DEPARTMENT_COLORS[name] || 'hsl(var(--primary))',
  }));

  return {
    totalClients,
    totalCallLogs: callLogsCount || 0,
    chartData,
  };
};

const POSReportsPage = () => {
  const { session } = useSession();
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('this_month');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['posAnalytics', dateFilter],
    queryFn: () => fetchPOSAnalyticsData(dateFilter),
    enabled: !!session?.user?.id,
  });

  const handleExport = async (type: 'pos_clients' | 'pos_call_logs') => {
    if (!session?.user) return;
    const toastId = showLoading(`جاري تصدير ${type === 'pos_clients' ? 'عملاء نقاط البيع' : 'سجل المكالمات'}...`);
    
    const { startDate, endDate } = getDateRange(dateFilter);

    try {
      if (type === 'pos_clients') {
        let query = supabase.from('pos_clients').select('*');
        if (startDate && endDate) {
          query = query.gte('created_at', startDate).lte('created_at', endDate);
        }
        const { data: clients, error } = await query;
        if (error) throw error;
        const headers = [
          { key: 'client_code', label: 'كود العميل' },
          { key: 'client_name', label: 'اسم العميل' },
          { key: 'department', label: 'القسم' },
          { key: 'created_at', label: 'تاريخ الإنشاء' },
        ];
        downloadCSV(clients, headers, `pos_clients_export_${dateFilter}`);
      } else {
        const { data: posClientsData, error: posClientsError } = await supabase.from('pos_clients').select('id, client_name');
        if (posClientsError) throw posClientsError;
        const posClientMap = new Map(posClientsData.map(c => [c.id, c.client_name]));

        let query = supabase.from('pos_call_logs').select('*');
        if (startDate && endDate) {
          query = query.gte('created_at', startDate).lte('created_at', endDate);
        }
        const { data: callLogs, error } = await query;
        if (error) throw error;

        const enrichedCallLogs = callLogs.map(log => ({
          ...log,
          client_name: posClientMap.get(log.pos_client_id) || 'عميل غير معروف'
        }));

        const headers = [
          { key: 'client_name', label: 'اسم العميل' },
          { key: 'user_full_name', label: 'بواسطة' },
          { key: 'call_date', label: 'تاريخ المكالمة' },
          { key: 'notes', label: 'الملاحظات' },
          { key: 'created_at', label: 'تاريخ الإنشاء' },
        ];
        downloadCSV(enrichedCallLogs, headers, `pos_call_logs_export_${dateFilter}`);
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
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex-1">
            <h1 className="text-2xl font-bold">تقارير نقاط البيع (POS)</h1>
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
            <Link to="/pos">
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
                  <CardTitle className="text-sm font-medium">إجمالي عملاء POS</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.totalClients}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي المكالمات</CardTitle>
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+{data.totalCallLogs}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">متوسط المكالمات لكل عميل</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(data.totalClients > 0 ? data.totalCallLogs / data.totalClients : 0).toFixed(1)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>توزيع عملاء POS حسب القسم</CardTitle>
                <CardDescription>
                  نظرة عامة على عملاء نقاط البيع الحاليين حسب القسم. إجمالي العملاء: {data.totalClients}
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
                <CardDescription>قم بتنزيل بيانات عملاء نقاط البيع وسجل المكالمات كملف CSV للفترة الزمنية المحددة.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-4">
                <Button onClick={() => handleExport('pos_clients')}>
                  <FileDown className="ml-2 h-4 w-4" />
                  تصدير عملاء POS
                </Button>
                <Button onClick={() => handleExport('pos_call_logs')} variant="secondary">
                  <FileDown className="ml-2 h-4 w-4" />
                  تصدير سجل مكالمات POS
                </Button>
              </CardContent>
            </Card>
          </section>
        </main>
      )}
    </div>
  );
};

export default POSReportsPage;