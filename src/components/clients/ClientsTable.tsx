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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/SessionContext";
import { Client } from "@/types/client";
import { Skeleton } from "@/components/ui/skeleton";

const fetchClients = async (userId: string): Promise<Client[]> => {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const ClientsTable = () => {
  const { session } = useSession();
  const {
    data: clients,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["clients", session?.user?.id],
    queryFn: () => fetchClients(session!.user!.id),
    enabled: !!session?.user?.id,
  });

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
    <Table dir="rtl">
      <TableCaption>قائمة بجميع عملائك.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="text-right">اسم الشركة</TableHead>
          <TableHead className="text-right">الشخص المسؤول</TableHead>
          <TableHead className="text-right">الهاتف</TableHead>
          <TableHead className="text-right">البريد الإلكتروني</TableHead>
          <TableHead className="text-right">عدد السيارات</TableHead>
          <TableHead className="text-right">نوع الوقود</TableHead>
          <TableHead className="text-right">الحالة</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients && clients.length > 0 ? (
          clients.map((client) => (
            <TableRow key={client.id}>
              <TableCell className="font-medium">{client.company_name}</TableCell>
              <TableCell>{client.contact_person || "-"}</TableCell>
              <TableCell>{client.phone || "-"}</TableCell>
              <TableCell>{client.email || "-"}</TableCell>
              <TableCell>{client.number_of_cars || "-"}</TableCell>
              <TableCell>{client.fuel_type || "-"}</TableCell>
              <TableCell>
                <Badge>{client.status || "جديد"}</Badge>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={7} className="h-24 text-center">
              لا يوجد عملاء حتى الآن. قم بإضافة عميل جديد للبدء.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};