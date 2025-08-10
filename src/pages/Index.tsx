import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { AddClientDialog } from '@/components/clients/AddClientDialog';
import { ClientsTable } from '@/components/clients/ClientsTable';
import { Settings, User, LogOut, FileText } from 'lucide-react';
import { UpcomingFollowUps } from '@/components/notifications/UpcomingFollowUps';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from '@/context/SessionContext';

const Index = () => {
  const { session } = useSession();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // The SessionProvider will handle the redirect automatically.
  };

  return (
    <div dir="rtl" className="container mx-auto p-4 md:p-8">
      <header className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <img src="https://dtgiroqrqxzzdicwhsbw.supabase.co/storage/v1/object/public/public-assets/Smart-Logo-Horizontal.jpg" alt="Smart Fuel Logo" className="h-12" />
        <div className="flex items-center gap-2">
          <UpcomingFollowUps />
          <Button asChild variant="outline">
            <Link to="/reports">
              <FileText className="ml-2 h-4 w-4" />
              التقارير
            </Link>
          </Button>
          <AddClientDialog />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <User className="h-5 w-5" />
                <span className="sr-only">قائمة المستخدم</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" dir="rtl">
              <DropdownMenuLabel>حسابي</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile">
                  <User className="ml-2 h-4 w-4" />
                  <span>الملف الشخصي</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings">
                  <Settings className="ml-2 h-4 w-4" />
                  <span>الإعدادات</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="ml-2 h-4 w-4" />
                <span>تسجيل الخروج</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main>
        <ClientsTable />
      </main>
    </div>
  );
};

export default Index;