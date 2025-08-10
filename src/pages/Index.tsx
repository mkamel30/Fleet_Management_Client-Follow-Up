import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useSession } from '@/context/SessionContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

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
    return <div>جاري التحميل...</div>;
  }

  return (
    <div dir="rtl" className="p-4 md:p-8">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">نظام متابعة العملاء</h1>
        <Button onClick={handleLogout}>تسجيل الخروج</Button>
      </header>
      <main>
        <p>أهلاً بك، {session?.user?.email}</p>
        <p>هنا سيتم عرض لوحة التحكم الخاصة بالعملاء.</p>
      </main>
    </div>
  );
};

export default Index;