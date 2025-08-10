import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { AddClientDialog } from '@/components/clients/AddClientDialog';
import { ClientsTable } from '@/components/clients/ClientsTable';
import { Settings as SettingsIcon } from 'lucide-react';

const Index = () => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    // The SessionProvider will handle the redirect automatically.
  };

  return (
    <div dir="rtl" className="container mx-auto p-4 md:p-8">
      <header className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">لوحة تحكم العملاء</h1>
        <div className="flex items-center gap-2">
          <AddClientDialog />
          <Button asChild variant="ghost" size="icon">
            <Link to="/settings">
              <SettingsIcon className="h-5 w-5" />
              <span className="sr-only">الإعدادات</span>
            </Link>
          </Button>
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