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
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/SessionContext";
import { PosClient } from "@/types/pos";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUp, ArrowDown } from "lucide-react";
import { POSClientActions } from "./POSClientActions";
import { Badge } from "@/components/ui/badge";

type SortDirection = 'asc' | 'desc';
type SortableKeys = keyof PosClient;

interface SortConfig {
  key: SortableKeys;
  direction: SortDirection;
}

interface POSClientsTableProps {
  searchTerm: string;
}

const fetchPOSClients = async (): Promise<PosClient[]> => {
  const { data, error } = await supabase
    .from("pos_clients_with_status")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as PosClient[];
};

const getPOSStatusBadgeClass = (status: string | null) => {
  switch (status) {
    case 'مهتم':
      return 'bg-green-500 text-white hover:bg-green-500/90 border-transparent';
    case 'تم الإرسال للتعاقد':
      return 'bg-blue-500 text-white hover:bg-blue-500/90 border-transparent';
    case 'غير مهتم':
      return 'bg-destructive text-destructive-foreground hover:bg-destructive/90 border-transparent';
    case 'متابعة لاحقاً':
      return 'bg-yellow-500 text-white hover:bg-yellow-500/90 border-transparent';
    default:
      return 'bg-gray-400 text-white hover:bg-gray-400/90 border-transparent';
  }
};

export const POSClientsTable = ({ searchTerm }: POSClientsTableProps) => {
  const { session } = useSession();
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const {
    data: clients,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["posClients"],
    queryFn: fetchPOSClients,
    enabled: !!session?.user?.id,
  });

  const processedClients = useMemo(() => {
    if (!clients) return [];
    
    let filtered = clients.filter(client => {
      return searchTerm.trim() === '' ||
        client.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.client_code.toLowerCase().includes(searchTerm.toLowerCase());
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
  }, [clients, searchTerm, sortConfig]);

  const requestSort = (key: SortableKeys) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortableKeys) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
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
                  كود العميل {getSortIcon('client_code')}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" onClick={() => requestSort('client_name')}>
                  اسم العميل {getSortIcon('client_name')}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" onClick={() => requestSort('supply_management')}>
                  الإدارة التموينية {getSortIcon('supply_management')}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" onClick={() => requestSort('phone')}>
                  رقم التليفون {getSortIcon('phone')}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" onClick={() => requestSort('last_status')}>
                  الحالة {getSortIcon('last_status')}
                </Button>
              </TableHead>
              <TableHead className="text-right">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedClients && processedClients.length > 0 ? (
              processedClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.client_code}</TableCell>
                  <TableCell>{client.client_name}</TableCell>
                  <TableCell>{client.supply_management || "-"}</TableCell>
                  <TableCell>{client.phone || "-"}</TableCell>
                  <TableCell>
                    {client.last_status ? (
                      <Badge className={getPOSStatusBadgeClass(client.last_status)}>
                        {client.last_status}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <POSClientActions client={client} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {clients && clients.length > 0 ? "لم يتم العثور على عملاء يطابقون بحثك." : "لا يوجد عملاء حتى الآن."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};