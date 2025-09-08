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
import { PosClient } from "@/types/pos"; // Changed to PosClient
import { Skeleton } from "@/components/ui/skeleton";
import { MoreHorizontal, Edit, Trash2, Phone, History, PlusCircle, ArrowUp, ArrowDown, StickyNote } from "lucide-react";
import { EditPOSClientDialog } from "./EditPOSClientDialog";
import { DeletePOSClientAlert } from "./DeletePOSClientAlert";
import { AddCallLogDialog } from "./AddCallLogDialog";
import { CallLogHistoryDialog } from "./CallLogHistoryDialog";
import { PosClientNotesDialog } from "./PosClientNotesDialog";
import { showError, showSuccess } from "@/utils/toast";

type SortDirection = 'asc' | 'desc';
type SortableClientKeys = keyof PosClient; // Changed to PosClient

interface SortConfig {
  key: SortableClientKeys;
  direction: SortDirection;
}

const fetchPOSClients = async (searchTerm: string, departmentFilter: string): Promise<PosClient[]> => { // Changed to PosClient
  let query = supabase
    .from("pos_clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (searchTerm) {
    query = query.or(`client_name.ilike.%${searchTerm}%,client_code.ilike.%${searchTerm}%`);
  }

  if (departmentFilter !== "all") {
    query = query.eq("department", departmentFilter);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return data || [];
};

export const POSClientsTable = ({ searchTerm, departmentFilter }: { searchTerm: string; departmentFilter: string }) => {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  // State for managing dialogs
  const [isAddCallLogDialogOpen, setIsAddCallLogDialogOpen] = useState(false);
  const [isCallLogHistoryDialogOpen, setIsCallLogHistoryDialogOpen] = useState(false);
  const [isPosClientNotesDialogOpen, setIsPosClientNotesDialogOpen] = useState(false);
  const [isEditPOSClientDialogOpen, setIsEditPOSClientDialogOpen] = useState(false);
  const [isDeletePOSClientAlertOpen, setIsDeletePOSClientAlertOpen] = useState(false);

  const [selectedPOSClientForAction, setSelectedPOSClientForAction] = useState<PosClient | null>(null); // Changed to PosClient

  const {
    data: clients,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["posClients", searchTerm, departmentFilter],
    queryFn: () => fetchPOSClients(searchTerm, departmentFilter),
    enabled: !!session?.user?.id,
  });

  const processedClients = useMemo(() => {
    if (!clients) return [];
    
    let filtered = [...clients];

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
  }, [clients, sortConfig]);

  const requestSort = (key: SortableClientKeys) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortableClientKeys) => {
    if (!sortConfig || sortConfig.key !== key) {
      return null;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="ml-1 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-1 h-4 w-4" />
    );
  };

  const handleConfirmDeletePOSClient = () => {
    setIsDeletePOSClientAlertOpen(false); // Close alert after delete action
    setSelectedPOSClientForAction(null); // Clear selected client
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (isError) {
    return <div className="text-red-500">حدث خطأ في جلب البيانات: {error.message}</div>;
  }

  return (
    <div dir="rtl">
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
              <TableHead className="text-right">تاريخ الإضافة</TableHead>
              <TableHead className="text-right">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedClients && processedClients.length > 0 ? (
              processedClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.client_code}</TableCell>
                  <TableCell>{client.client_name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{client.department || "غير محدد"}</Badge>
                  </TableCell>
                  <TableCell>{new Date(client.created_at).toLocaleDateString('ar-SA')}</TableCell>
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
                        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setSelectedPOSClientForAction(client); setIsAddCallLogDialogOpen(true); }}>
                          <span className="flex items-center">
                                <Phone className="ml-2 h-4 w-4" />
                                <span>إضافة مكالمة</span>
                            </span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setSelectedPOSClientForAction(client); setIsCallLogHistoryDialogOpen(true); }}>
                          <span className="flex items-center">
                                <History className="ml-2 h-4 w-4" />
                                <span>سجل المكالمات</span>
                            </span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setSelectedPOSClientForAction(client); setIsPosClientNotesDialogOpen(true); }}>
                          <span className="flex items-center">
                                <StickyNote className="ml-2 h-4 w-4" />
                                <span>الملاحظات</span>
                            </span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setSelectedPOSClientForAction(client); setIsEditPOSClientDialogOpen(true); }}>
                          <span className="flex items-center">
                                <Edit className="ml-2 h-4 w-4" />
                                <span>تعديل</span>
                            </span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onSelect={(e) => {
                            e.preventDefault();
                            setSelectedPOSClientForAction(client);
                            setIsDeletePOSClientAlertOpen(true);
                          }}
                          className="text-red-600 focus:text-red-600"
                        >
                          <span className="flex items-center">
                            <Trash2 className="ml-2 h-4 w-4" />
                            <span>حذف</span>
                          </span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  {clients && clients.length > 0 ? "لم يتم العثور على عملاء يطابقون بحثك." : "لا يوجد عملاء حتى الآن. قم بإضافة عميل جديد للبدء."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Render all controlled dialogs outside the table */}
      {selectedPOSClientForAction && (
        <>
          <AddCallLogDialog 
            posClient={selectedPOSClientForAction} 
            open={isAddCallLogDialogOpen} 
            onOpenChange={setIsAddCallLogDialogOpen} 
          />
          <CallLogHistoryDialog 
            posClient={selectedPOSClientForAction} 
            open={isCallLogHistoryDialogOpen} 
            onOpenChange={setIsCallLogHistoryDialogOpen} 
          />
          <PosClientNotesDialog 
            posClient={selectedPOSClientForAction} 
            open={isPosClientNotesDialogOpen} 
            onOpenChange={setIsPosClientNotesDialogOpen} 
          />
          <EditPOSClientDialog 
            client={selectedPOSClientForAction} 
            open={isEditPOSClientDialogOpen} 
            onOpenChange={setIsEditPOSClientDialogOpen} 
          />
          <DeletePOSClientAlert 
            clientId={selectedPOSClientForAction.id} 
            open={isDeletePOSClientAlertOpen} 
            onOpenChange={setIsDeletePOSClientAlertOpen}
            onConfirmDelete={handleConfirmDeletePOSClient}
          />
        </>
      )}
    </div>
  );
};