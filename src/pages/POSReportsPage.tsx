import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/SessionContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileDown, Users, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { downloadCSV } from "@/lib/csv";
import { showError, showLoading, dismissToast, showSuccess } from "@/utils/toast";
import { Separator } from "@/components/ui/separator";

const fetchPOSAnalyticsData = async () => {
  const { data: clients, error: clientsError } = await supabase.from('pos_clients').select('id, supply_management');
  if (clientsError) throw new Error(clientsError.message);

  const { count: callLogsCount, error: callLogsError } = await supabase.from('pos_call_logs').select('*', { count: 'exact', head: true });
  if (callLogsError) throw new Error(callLogsError.message);

  const totalClients = clients.length;

  const clientsBySupplyManagement = clients.reduce((acc, client) => {
    const supplyManagement = client.supply_management || 'غير محدد';
    acc[supplyManagement] = (acc[supplyManagement] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(clientsBySupplyManagement).map(([name, value]) => ({
    name,
    'عدد العملاء': value,
  }));

  return {
    totalClients,
    totalCallLogs: callLogsCount || 0,
    chartData,
  };
};

const POSReportsPage = () => {
  const { session } = useSession();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['posAnalytics'],
    queryFn: fetchPOSAnalyticsData,
    enabled: !!session?.user?.id,
  });

  const handleExport = async (type: 'clients' | 'call_logs') => {
    if (!session?.user) return;
    const toastId = showLoading(`جاري تصدير ${type === 'clients' ? 'العملاء' : 'المكالمات'}...`);
    
    try {
      if (type === 'clients') {
        const { data: clients, error } = await supabase.from('pos_clients').select('*');
        if (error) throw error;
        const headers = [
          { key: 'client_code', label: 'كود العميل' },
          { key: 'client_name', label: 'اسم العميل' },
          { key: 'supply_management', label: 'الإدارة التموينية' },
          { key: 'phone', label: 'رقم التليفون' },
          { key: 'created_at', label: 'تاريخ الإنشاء' },
        ];
        downloadCSV(clients, headers, `pos_clients_export`);
      } else {
        const { data: clientsData, error: clientsError } = await supabase.from('pos_clients').select('id, client_name, client_code');
        if (clientsError) throw clientsError;
        const clientMap = new Map(clientsData.map(c => [c.id, { name: c.client_name, code: c.client_code }]));

        const { data: callLogs, error } = await supabase.from('pos_call_logs').select('*');
        if (error) throw error;

        const enrichedLogs = callLogs.map(log => ({
          ...log,
          client_name: clientMap.get(log.pos_client_id)?.name || 'غير معروف',
          client_code: clientMap.get(log.pos_client_id)?.code || 'غير معروف',
        }));

        const headers = [
          { key: 'client_code', label: 'كود العميل' },
          { key: 'client_name', label: 'اسم العميل' },
          { key: 'feedback', label: 'الملاحظات' },
          { key: 'status', label: 'الحالة' },
          { key: 'next_follow_up_date', label: 'تاريخ المتابعة التالية' },
          { key: 'created_at', label: 'تاريخ الإنشاء' },
          { key: 'user_full_name', label: 'بواسطة' },
        ];
        downloadCSV(enrichedLogs, headers, `pos_call_logs_export`);
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
        <h1 className="text-2xl font-bold">تقارير نقاط البيع</h1>
        <Button asChild variant="outline">
          <Link to="/pos">
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة
          </Link>
        </Button>
      </header>
      
      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                  <CardTitle className="text-sm font-medium">إجمالي المكالمات المسجلة</CardTitle>
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.totalCallLogs}</div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>توزيع العملاء حسب الإدارة التموينية</CardTitle>
                <CardDescription>
                  نظرة عامة على الإدارات التموينية لعملائك.
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                    <Tooltip wrapperClassName="!bg-background !border-border" cursor={{ fill: 'hsl(var(--muted))' }} />
                    <Bar dataKey="عدد العملاء" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="عدد العملاء" position="top" style={{ fill: 'hsl(var(--foreground))', fontSize: 12 }} />
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
                <CardDescription>قم بتنزيل بيانات عملاء نقاط البيع وسجل المكالمات كملف CSV.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-4">
                <Button onClick={() => handleExport('clients')}>
                  <FileDown className="ml-2 h-4 w-4" />
                  تصدير العملاء
                </Button>
                <Button onClick={() => handleExport('call_logs')} variant="secondary">
                  <FileDown className="ml-2 h-4 w-4" />
                  تصدير سجل المكالمات
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