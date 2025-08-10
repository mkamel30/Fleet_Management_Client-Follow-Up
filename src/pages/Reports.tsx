import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/SessionContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileDown, Users, Target, CheckCircle, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { startOfMonth, endOfMonth } from 'date-fns';
import { downloadCSV } from "@/lib/csv";
import { showError, showLoading, dismissToast, showSuccess } from "@/utils/toast";
import { Separator } from "@/components/ui/separator";

const fetchAnalyticsData = async (userId: string) => {
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, status')
    .eq('user_id', userId);

  if (clientsError) throw new Error(clientsError.message);

  const now = new Date();
  const startDate = startOfMonth(now).toISOString();
  const endDate = endOfMonth(now).toISOString();

  const { count: followUpsThisMonth, error: followUpsError } = await supabase
    .from('follow_ups')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (followUpsError) throw new Error(followUpsError.message);

  const totalClients = clients.length;
  const contractedClients = clients.filter(c => c.status === 'تم التعاقد').length;
  const conversionRate = totalClients > 0 ? (contractedClients / totalClients) * 100 : 0;

  const clientsByStatus = clients.reduce((acc, client) => {
    const status = client.status || 'جديد';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(clientsByStatus).map(([name, value]) => ({ name, 'عدد العملاء': value }));

  return {
    totalClients,
    contractedClients,
    conversionRate,
    followUpsThisMonth: followUpsThisMonth || 0,
    chartData,
  };
};

const ReportsPage = () => {
  const { session } = useSession();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['analytics', session?.user?.id],
    queryFn: () => fetchAnalyticsData(session!.user!.id),
    enabled: !!session?.user?.id,
  });

  const handleExport = async (type: 'clients' | 'follow_ups') => {
    if (!session?.user) return;
    const toastId = showLoading(`جاري تصدير ${type === 'clients' ? 'العملاء' : 'المتابعات'}...`);

    try {
      if (type === 'clients') {
        const { data: clients, error } = await supabase.from('clients').select('*').eq('user_id', session.user.id);
        if (error) throw error;
        const headers = [
          { key: 'company_name', label: 'اسم الشركة' },
          { key: 'contact_person', label: 'الشخص المسؤول' },
          { key: 'phone', label: 'الهاتف' },
          { key: 'email', label: 'البريد الإلكتروني' },
          { key: 'number_of_cars', label: 'عدد السيارات' },
          { key: 'fuel_type', label: 'نوع الوقود' },
          { key: 'status', label: 'الحالة' },
          { key: 'created_at', label: 'تاريخ الإنشاء' },
        ];
        downloadCSV(clients, headers, 'clients_export');
      } else {
        const { data: clientsData, error: clientsError } = await supabase.from('clients').select('id, company_name').eq('user_id', session.user.id);
        if (clientsError) throw clientsError;
        const clientMap = new Map(clientsData.map(c => [c.id, c.company_name]));

        const { data: followUps, error } = await supabase.from('follow_ups_with_user').select('*').eq('user_id', session.user.id);
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
        downloadCSV(enrichedFollowUps, headers, 'follow_ups_export');
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
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">التقارير والتحليلات</h1>
        <Button asChild variant="outline">
          <Link to="/">
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة للرئيسية
          </Link>
        </Button>
      </header>
      
      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                  <CardTitle className="text-sm font-medium">المتابعات هذا الشهر</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+{data.followUpsThisMonth}</div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>توزيع العملاء حسب الحالة</CardTitle>
                <CardDescription>نظرة عامة على حالة عملائك الحاليين.</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                    <Tooltip wrapperClassName="!bg-background !border-border" cursor={{ fill: 'hsl(var(--muted))' }} />
                    <Legend />
                    <Bar dataKey="عدد العملاء" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
              <CardFooter className="flex justify-center">
                <p className="text-sm font-bold text-muted-foreground">
                  إجمالي عدد العملاء: {data.totalClients}
                </p>
              </CardFooter>
            </Card>
          </section>

          <Separator />

          <section>
            <Card>
              <CardHeader>
                <CardTitle>تصدير البيانات</CardTitle>
                <CardDescription>قم بتنزيل بيانات العملاء والمتابعات كملف CSV.</CardDescription>
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