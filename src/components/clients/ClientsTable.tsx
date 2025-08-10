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
import { MessageTemplate } from "@/types/template";
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

const fetchTemplates = async (userId: string): Promise<MessageTemplate[]> => {
  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to fetch templates: ${error.message}`);
  }
  return data || [];
};

export const ClientsTable = () => {
  const { session } = useSession();
  const {
    data: clients,
    isLoading: isLoadingClients,
    isError: isErrorClients,
    error: errorClients,
  } = useQuery({
    queryKey: ["clients", session?.user?.id],
    queryFn: () => fetchClients(session!.user!.id),
    enabled: !!session?.user?.id,
  });

  const {
    data: templates,
    isLoading: isLoadingTemplates,
  } = useQuery({
    queryKey: ["messageTemplates", session?.user?.id],
    queryFn: () => fetchTemplates(session!.user!.id),
    enabled: !!session?.user?.id,
  });

  const emailTemplate = templates?.find(t => t.type === 'email');
  const whatsappTemplate = templates?.find(t => t.type === 'whatsapp');

  const formatWhatsAppNumber = (phone: string) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('20')) {
      return cleaned;
    }
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    return `20${cleaned}`;
  };

  const createMailtoLink = (clientEmail: string, template: MessageTemplate | undefined) => {
    if (!template) return `mailto:${clientEmail}`;
    const params = new URLSearchParams();
    if (template.subject) params.append('subject', template.subject);
    if (template.cc) params.append('cc', template.cc);
    
    let body = template.body || '';
    if (template.attachment_url) {
      body += `\n\nالمرفق: ${template.attachment_url}`;
    }
    params.append('body', body);

    return `mailto:${clientEmail}?${params.toString()}`;
  };

  const createWhatsAppLink = (clientPhone: string, template: MessageTemplate | undefined) => {
    const formattedPhone = formatWhatsAppNumber(clientPhone);
    if (!template) return `https://wa.me/${formattedPhone}`;

    let text = template.body || '';
    if (template.attachment_url) {
      text += `\n\nيمكنك تحميل المرفق من الرابط التالي:\n${template.attachment_url}`;
    }
    
    const params = new URLSearchParams();
    params.append('text', text);

    return `https://wa.me/${formattedPhone}?${params.toString()}`;
  };

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
                        <a href={createMailtoLink(client.email!, emailTemplate)}>
                          <Mail className="ml-2 h-4 w-4" />
                          <span>إرسال بريد إلكتروني</span>
                        </a>
                      </DropdownMenuItem>
                    )}
                    {client.phone && (
                       <DropdownMenuItem asChild>
                        <a href={createWhatsAppLink(client.phone, whatsappTemplate)} target="_blank" rel="noopener noreferrer">
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