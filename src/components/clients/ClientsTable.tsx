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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/SessionContext";
import { Client } from "@/types/client";
import { MessageTemplate } from "@/types/template";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUp, ArrowDown } from "lucide-react";
import { ClientActions } from "./ClientActions"; // Import the new component
import { showError } from "@/utils/toast";

type SortDirection = 'asc' | 'desc';
type SortableClientKeys = keyof Client;

interface SortConfig {
  key: SortableClientKeys;
  direction: SortDirection;
}

const fetchClients = async (): Promise<Client[]> => {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

const fetchTemplates = async (): Promise<MessageTemplate[]> => {
  const { data, error } = await supabase
    .from("message_templates")
    .select("*, attachments:template_attachments(*)");

  if (error) throw new Error(`Failed to fetch templates: ${error.message}`);
  return (data as MessageTemplate[]) || [];
};

const getStatusBadgeClass = (status: string | null) => {
  switch (status) {
    case 'تم التعاقد':
      return 'bg-success text-success-foreground hover:bg-success/90 border-transparent';
    case 'لا يرغب':
      return 'bg-destructive text-destructive-foreground hover:bg-destructive/90 border-transparent';
    case 'متابعة مستمرة':
      return 'bg-yellow-500 text-white hover:bg-yellow-500/90 border-transparent';
    case 'تواصل لاحقاً':
      return 'bg-purple-500 text-white hover:bg-purple-500/90 border-transparent';
    case 'جديد':
    default:
      return 'bg-accent text-accent-foreground hover:bg-accent/90 border-transparent';
  }
};

export const ClientsTable = () => {
  const { session } = useSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const {
    data: clients,
    isLoading: isLoadingClients,
    isError: isErrorClients,
    error: errorClients,
  } = useQuery({
    queryKey: ["clients"],
    queryFn: fetchClients,
    enabled: !!session?.user?.id,
  });

  const {
    data: templates,
    isLoading: isLoadingTemplates,
  } = useQuery({
    queryKey: ["messageTemplates"],
    queryFn: fetchTemplates,
    enabled: !!session?.user?.id,
  });

  const processedClients = useMemo(() => {
    if (!clients) return [];
    
    let filtered = clients.filter(client => {
      const clientStatus = client.status || 'جديد';
      const matchesStatus = statusFilter === 'all' || clientStatus === statusFilter;
      
      const matchesSearch = searchTerm.trim() === '' ||
        client.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.contact_person && client.contact_person.toLowerCase().includes(searchTerm.toLowerCase()));
        
      return matchesStatus && matchesSearch;
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
  }, [clients, searchTerm, statusFilter, sortConfig]);

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
    return sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const emailTemplate = templates?.find(t => t.type === 'email');
  const whatsappTemplate = templates?.find(t => t.type === 'whatsapp');

  if (isLoadingClients || isLoadingTemplates) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (isErrorClients) {
    return <div className="text-red-500">حدث خطأ في جلب البيانات: {errorClients.message}</div>;
  }

  return (
    <div dir="rtl">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-4">
        <Input
          placeholder="ابحث باسم الشركة أو الشخص المسؤول..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="فلترة حسب الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="جديد">جديد</SelectItem>
            <SelectItem value="متابعة مستمرة">متابعة مستمرة</SelectItem>
            <SelectItem value="تم التعاقد">تم التعاقد</SelectItem>
            <SelectItem value="لا يرغب">لا يرغب</SelectItem>
            <SelectItem value="تواصل لاحقاً">تواصل لاحقاً</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableCaption>قائمة بجميع عملائك.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">
                <Button variant="ghost" onClick={() => requestSort('company_name')}>
                  اسم الشركة {getSortIcon('company_name')}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" onClick={() => requestSort('contact_person')}>
                  الشخص المسؤول {getSortIcon('contact_person')}
                </Button>
              </TableHead>
              <TableHead className="text-right">الهاتف</TableHead>
              <TableHead className="text-right">البريد الإلكتروني</TableHead>
              <TableHead className="text-right">
                  <Button variant="ghost" onClick={() => requestSort('address')}>
                      العنوان {getSortIcon('address')}
                  </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" onClick={() => requestSort('number_of_cars')}>
                  عدد السيارات {getSortIcon('number_of_cars')}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" onClick={() => requestSort('fuel_type')}>
                  نوع الوقود {getSortIcon('fuel_type')}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" onClick={() => requestSort('status')}>
                  الحالة {getSortIcon('status')}
                </Button>
              </TableHead>
              <TableHead className="text-right">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedClients && processedClients.length > 0 ? (
              processedClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.company_name}</TableCell>
                  <TableCell>{client.contact_person || "-"}</TableCell>
                  <TableCell>{client.phone || "-"}</TableCell>
                  <TableCell>{client.email || "-"}</TableCell>
                  <TableCell>{client.address || "-"}</TableCell>
                  <TableCell>{client.number_of_cars || "-"}</TableCell>
                  <TableCell>{client.fuel_type || "-"}</TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeClass(client.status)}>
                      {client.status || "جديد"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ClientActions 
                      client={client} 
                      emailTemplate={emailTemplate} 
                      whatsappTemplate={whatsappTemplate} 
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  {clients && clients.length > 0 ? "لم يتم العثور على عملاء يطابقون بحثك." : "لا يوجد عملاء حتى الآن. قم بإضافة عميل جديد للبدء."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};