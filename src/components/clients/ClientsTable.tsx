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
import { MessageTemplate } from "@/types/template";
import { showError } from "@/utils/toast";

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

const fetchTemplate = async (userId: string, type: 'email' | 'whatsapp'): Promise<MessageTemplate | null> => {
  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .eq("user_id", userId)
    .eq("type", type)
    .single();

  if (error && error.code !== "PGRST116") {
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

  const { data: emailTemplate } = useQuery({
    queryKey: ["emailTemplate", session?.user?.id],
    queryFn: () => fetchTemplate(session!.user!.id, 'email'),
    enabled: !!session?.user?.id,
  });

  const { data: whatsappTemplate } = useQuery({
    queryKey: ["whatsappTemplate", session?.user?.id],
    queryFn: () => fetchTemplate(session!.user!.id, 'whatsapp'),
    enabled: !!session?.user?.id,
  });

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

  const replacePlaceholders = (text: string | null, client: Client): string => {
    if (!text) return "";
    return text
      .replace(/{company_name}/g, client.company_name || '')
      .replace(/{contact_person}/g, client.contact_person || '')
      .replace(/{phone}/g, client.phone || '')
      .replace(/{email}/g, client.email || '')
      .replace(/{number_of_cars}/g, client.number_of_cars?.toString() || '')
      .replace(/{fuel_type}/g, client.fuel_type || '');
  };

  const handleSendEmail = (client: Client) => {
    if (!client.email) return;
    if (!emailTemplate || !emailTemplate.body) {
        showError("الرجاء إعداد قالب البريد الإلكتروني أولاً في صفحة الإعدادات.");
        return;
    }

    let body = replacePlaceholders(emailTemplate.body, client);
    if (emailTemplate.attachment_url) {
        body += `\n\nالمرفق: ${emailTemplate.attachment_url}`;
    }

    const subject = replacePlaceholders(emailTemplate.subject, client);
    const cc = emailTemplate.cc || '';

    const mailtoLink = `mailto:${client.email}?subject=${encodeURIComponent(subject)}&cc=${encodeURIComponent(cc)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  const handleSendWhatsApp = (client: Client) => {
    if (!client.phone) return;
    if (!whatsappTemplate || !whatsappTemplate.body) {
        showError("الرجاء إعداد قالب واتساب أولاً في صفحة الإعدادات.");
        return;
    }

    let body = replacePlaceholders(whatsappTemplate.body, client);
    if (whatsappTemplate.attachment_url) {
        body += `\n\nالمرفق: ${whatsappTemplate.attachment_url}`;
    }

    const whatsappLink = `https://wa.me/${formatWhatsAppNumber(client.phone)}?text=${encodeURIComponent(body)}`;
    window.open(whatsappLink, '_blank', 'noopener,noreferrer');
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
                      <DropdownMenuItem onClick={() => handleSendEmail(client)}>
                        <Mail className="ml-2 h-4 w-4" />
                        <span>إرسال بريد إلكتروني</span>
                      </DropdownMenuItem>
                    )}
                    {client.phone && (
                       <DropdownMenuItem onClick={() => handleSendWhatsApp(client)}>
                          <MessageSquare className="ml-2 h-4 w-4" />
                          <span>إرسال واتساب</span>
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