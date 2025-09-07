import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/SessionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, FileText, Upload, PlusCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { POSClientsTable } from "@/components/pos/POSClientsTable";
import { POSUploadDialog } from "@/components/pos/POSUploadDialog";

const POSPage = () => {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const { data: departments, isLoading: isLoadingDepartments } = useQuery({
    queryKey: ["posDepartments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pos_clients")
        .select("department")
        .not("department", "is", null)
        .order("department");

      if (error) throw new Error(error.message);
      const uniqueDepartments = Array.from(new Set(data.map(item => item.department).filter(Boolean)));
      return uniqueDepartments;
    },
    enabled: !!session?.user?.id,
  });

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
              <Upload className="ml-2 h-4 w-4" />
              رفع من Excel
            </Button>
          </POSUploadDialog>
          <Button asChild variant="outline">
            <Link to="/pos-reports">
              <FileText className="ml-2 h-4 w-4" />
              التقارير
            </Link>
          </Button>
          <Button asChild>
            <Link to="/">
              <ArrowRight className="ml-2 h-4 w-4" />
              العودة للعملاء
            </Link>
          </Button>
        </div>
      </header>
      
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-4">
        <Input
          placeholder="ابحث باسم العميل أو الكود..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:max-w-sm"
        />
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="فلترة حسب القسم" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأقسام</SelectItem>
            {isLoadingDepartments ? (
              <SelectItem value="loading">جاري التحميل...</SelectItem>
            ) : (
              departments?.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <main>
        <POSClientsTable searchTerm={searchTerm} departmentFilter={departmentFilter} />
      </main>
    </div>
  );
};

export default POSPage;