import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, FileText, Upload, User, Settings, LogOut, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { POSClientsTable } from "@/components/pos/POSClientsTable";
import { POSUploadDialog } from "@/components/pos/POSUploadDialog";
import { AddPOSClientDialog } from "@/components/pos/AddPOSClientDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/context/SessionContext';

const POSPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { session } = useSession();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // The SessionProvider will handle the redirect automatically.
  };

  return (
    <div dir="rtl" className="container mx-auto p-4 md:p-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">إدارة نقاط البيع (POS)</h1>
          <p className="text-gray-600 mt-1">إدارة العملاء المحتملين لنقاط البيع وتسجيل المكالمات</p>
        </div>
        <div className="flex items-center gap-2">
          <POSUploadDialog>
            <Button variant="outline">
              <span>
                <Upload className="ml-2 h-4 w-4" />
                رفع من Excel
              </span>
            </Button>
          </POSUploadDialog>
          <Button asChild variant="outline">
            <Link to="/pos-reports">
              <FileText className="ml-2 h-4 w-4" />
              التقارير
            </Link>
          </Button>
          <AddPOSClientDialog />
          <Button asChild variant="outline">
            <Link to="/">
              <Home className="ml-2 h-4 w-4" />
              العودة للصفحة الرئيسية
            </Link>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <span>
                  <User className="h-5 w-5" />
                  <span className="sr-only">قائمة المستخدم</span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
      
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-4">
        <Input
          placeholder="ابحث باسم العميل أو الكود..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:max-w-sm"
        />
      </div>

      <main>
        <POSClientsTable searchTerm={searchTerm} />
      </main>
    </div>
  );
};

export default POSPage;