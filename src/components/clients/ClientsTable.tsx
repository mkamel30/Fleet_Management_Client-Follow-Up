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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/SessionContext";
import { Client } from "@/types/client";
import { Skeleton } from "@/components/ui/skeleton";
import { MoreHorizontal, Edit, Trash2, Mail, MessageSquare } from "lucide-react";
import { EditClientDialog } from "./EditClientDialog";
import { DeleteClientAlert } from "./DeleteClientAlert";

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
          <TableHead className="text-right">الإجراءات</TableHead>
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
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">فتح القائمة</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" dir="rtl">
                    <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <EditClientDialog client={client}>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Edit className="ml-2 h-4 w-4" />
                        <span>تعديل</span>
                      </DropdownMenuItem>
                    </EditClientDialog>
                    {client.email && (
                      <DropdownMenuItem asChild>
                        <a href={`mailto:${client.email}`}>
                          <Mail className="ml-2 h-4 w-4" />
                          <span>إرسال بريد إلكتروني</span>
                        </a>
                      </DropdownMenuItem>
                    )}
                    {client.phone && (
                       <DropdownMenuItem asChild>
                        <a href={`https://wa.me/${client.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                          <MessageSquare className="ml-2 h-4 w-4" />
                          <span>إرسال واتساب</span>
                        </a>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DeleteClientAlert clientId={client.id}>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600">
                        <Trash2 className="ml-2 h-4 w-4" />
                        <span>حذف</span>
                      </DropdownMenuItem>
                    </DeleteClientAlert>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={8} className="h-24 text-center">
              لا يوجد عملاء حتى الآن. قم بإضافة عميل جديد للبدء.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};