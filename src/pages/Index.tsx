import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useSession } from '@/context/SessionContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AddClientDialog } from '@/components/clients/AddClientDialog';
import { ClientsTable } from '@/components/clients/ClientsTable';

const Index = () => {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      navigate('/login');
    }
  }, [session, loading, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center h-screen">
            <div>جاري التحميل...</div>
        </div>
    );
  }

  return (
    <div dir="rtl" className="container mx-auto p-4 md:p-8">
      <header className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">لوحة تحكم العملاء</h1>
        <div className="flex items-center gap-4">
          <AddClientDialog />
          <Button onClick={handleLogout} variant="outline">تسجيل الخروج</Button>
        </div>
      </header>
      <main>
        <ClientsTable />
      </main>
    </div>
  );
};

export default Index;