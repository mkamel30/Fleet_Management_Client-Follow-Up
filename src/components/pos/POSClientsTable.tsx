import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/SessionContext";
import { PosClient } from "@/types/pos";
import { Skeleton } from "@/components/ui/skeleton";
import { MoreHorizontal, Edit, Trash2, Phone, History, StickyNote, FileText } from "lucide-react";
import { EditPosClientDialog } from "./EditPosClientDialog";
import { DeletePosClientAlert } from "./DeletePosClientAlert";
import { AddCallLogDialog } from "./AddCallLogDialog";
import { CallLogHistoryDialog } from "./CallLogHistoryDialog";
import { PosClientNotesDialog } from "./PosClientNotesDialog";
import { showError, showSuccess } from "@/utils/toast";

type SortDirection = 'asc' | 'desc';
type SortablePosClientKeys = keyof PosClient;

interface SortConfig {
  key: SortablePosClientKeys;
  direction: SortDirection;
}

const fetchPosClients = async (): Promise<PosClient[]> => {
  const { data, error } = await supabase
    .from("pos_clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

const getStatusBadgeClass = (department: string | null) => {
  switch (department) {
    case 'تجزئة':
      return 'bg-blue-500 text-white hover:bg-blue-500/90 border-transparent';
    case 'خدمات':
      return 'bg-green-500 text-white hover:bg-green-500/90 border-transparent';
    case 'صناعة':
      return 'bg-purple-500 text-white hover:bg-purple-500/90 border-transparent';
    case 'حكومي':
      return 'bg-orange-500 text-white hover:bg-orange-500/90 border-transparent';
    default:
      return 'bg-accent text-accent-foreground hover:bg-accent/90 border-transparent';
  }
};

export const PosClientsTable = () => {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const {
    data: posClients,
    isLoading: isLoadingPosClients,
    isError: isErrorPosClients,
    error: errorPosClients,
  } = useQuery({
    queryKey: ["posClients"],
    queryFn: fetchPosClients,
    enabled: !!session?.user?.id,
  });

  const processedPosClients = useMemo(() => {
    if (!posClients) return [];
    
    let filtered = posClients.filter(client => {
      const matchesDepartment = departmentFilter === 'all' || client.department === departmentFilter;
      
      const matchesSearch = searchTerm.trim() === '' ||
        client.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.client_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.department && client.department.toLowerCase().includes(searchTerm.toLowerCase()));
        
      return matchesDepartment && matchesSearch;
    });

    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === null) return 1;
        if (bValue === null) return -1;

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [posClients, searchTerm, departmentFilter, sortConfig]);

  const requestSort = (key: SortablePosClientKeys) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortablePosClientKeys) => {
    if (!sortConfig || sortConfig.key !== key) {
      return null;
    }
    return sortConfig.direction === 'asc' ? <span className="ml-2 h-4 w-4">↑</span> : <span className="ml-2 h-4 w-4">↓</span>;
  };

  if (isLoadingPosClients) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (isErrorPosClients) {
    return <div className="text-red-500">حدث خطأ في جلب البيانات: {errorPosClients.message}</div>;
  }

  return (
    <div dir="rtl">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-4">
        <Input
          placeholder="ابحث باسم العميل أو الكود أو القسم..."
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
            <SelectItem value="تجزئة">تجزئة</SelectItem>
            <SelectItem value="خدمات">خدمات</SelectItem>
            <SelectItem value="صناعة">صناعة</SelectItem>
            <SelectItem value="حكومي">حكومي</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableCaption>قائمة بعملاء نقاط البيع.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">
                <Button variant="ghost" onClick={() => requestSort('client_code')}>
                  الكود {getSortIcon('client_code')}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" onClick={() => requestSort('client_name')}>
                  اسم العميل {getSortIcon('client_name')}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" onClick={() => requestSort('department')}>
                  القسم {getSortIcon('department')}
                </Button>
              </TableHead>
              <TableHead className="text-right">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedPosClients && processedPosClients.length > 0 ? (
              processedPosClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.client_code}</TableCell>
                  <TableCell>{client.client_name}</TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeClass(client.department)}>
                      {client.department || "غير محدد"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">فتح القائمة</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                        <AddCallLogDialog posClient={client}>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Phone className="ml-2 h-4 w-4" />
                            <span>إضافة مكالمة</span>
                          </DropdownMenuItem>
                        </AddCallLogDialog>
                        <CallLogHistoryDialog posClient={client}>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <History className="ml-2 h-4 w-4" />
                            <span>سجل المكالمات</span>
                          </DropdownMenuItem>
                        </CallLogHistoryDialog>
                        <PosClientNotesDialog posClient={client}>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <StickyNote className="ml-2 h-4 w-4" />
                            <span>الملاحظات</span>
                          </DropdownMenuItem>
                        </PosClientNotesDialog>
                        <DropdownMenuSeparator />
                        <EditPosClientDialog posClient={client}>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Edit className="ml-2 h-4 w-4" />
                            <span>تعديل</span>
                          </DropdownMenuItem>
                        </EditPosClientDialog>
                        <DropdownMenuSeparator />
                        <DeletePosClientAlert posClientId={client.id}>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600">
                            <Trash2 className="ml-2 h-4 w-4" />
                            <span>حذف</span>
                          </DropdownMenuItem>
                        </DeletePosClientAlert>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  {posClients && posClients.length > 0 ? "لم يتم العثور على عملاء يطابقون بحثك." : "لا يوجد عملاء حتى الآن. قم بإضافة عميل جديد للبدء."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};