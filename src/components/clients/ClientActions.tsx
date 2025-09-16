import { useState } from "react";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash2, Mail, MessageSquare, PlusCircle, History, StickyNote } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/SessionContext";
import { Client } from "@/types/client";
import { MessageTemplate } from "@/types/template";
import { showError, showSuccess } from "@/utils/toast";
import { AddFollowUpDialog } from "./AddFollowUpDialog";
import { FollowUpHistoryDialog } from "./FollowUpHistoryDialog";
import { ClientNotesDialog } from "./ClientNotesDialog";
import { EditClientDialog } from "./EditClientDialog";
import { DeleteClientAlert } from "./DeleteClientAlert";

interface ClientActionsProps {
  client: Client;
  emailTemplate: MessageTemplate | undefined;
  whatsappTemplate: MessageTemplate | undefined;
}

export const ClientActions = ({ client, emailTemplate, whatsappTemplate }: ClientActionsProps) => {
  const { session } = useSession();
  const queryClient = useQueryClient();

  // State for managing dialogs
  const [isAddFollowUpDialogOpen, setIsAddFollowUpDialogOpen] = useState(false);
  const [isFollowUpHistoryDialogOpen, setIsFollowUpHistoryDialogOpen] = useState(false);
  const [isClientNotesDialogOpen, setIsClientNotesDialogOpen] = useState(false);
  const [isEditClientDialogOpen, setIsEditClientDialogOpen] = useState(false);
  const [isDeleteClientAlertOpen, setIsDeleteClientAlertOpen] = useState(false);
  const [isEmailAlertDialogOpen, setIsEmailAlertDialogOpen] = useState(false);
  const [isWhatsAppAlertDialogOpen, setIsWhatsAppAlertDialogOpen] = useState(false);

  const logActionAsFollowUp = async (client: Client, type: 'email' | 'whatsapp') => {
    if (!session?.user) return;

    const localUserName = localStorage.getItem(`local_user_name_${session.user.id}`) || session.user.email || "مستخدم غير معروف";

    const feedbackMessage = type === 'email' 
        ? 'تم إرسال بريد إلكتروني باستخدام القالب.' 
        : 'تم إرسال رسالة واتساب باستخدام القالب.';

    const { error } = await supabase.from('follow_ups').insert({
        client_id: client.id,
        user_id: session.user.id,
        feedback: feedbackMessage,
        status: client.status || 'متابعة مستمرة',
        user_full_name: localUserName, // Add the user's full name here
    });

    if (error) {
        showError(`فشل تسجيل المتابعة: ${error.message}`);
    } else {
        showSuccess('تم تسجيل الإجراء في سجل المتابعة.');
        queryClient.invalidateQueries({ queryKey: ['followUps', client.id] });
    }
  };

  const formatWhatsAppNumber = (phone: string) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('20')) return cleaned;
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    return `20${cleaned}`;
  };

  const replacePlaceholders = (text: string, client: Client) => {
    return text
      .replace(/{company_name}/g, client.company_name || '')
      .replace(/{contact_person}/g, client.contact_person || '');
  };

  const handleEmailClick = async () => {
    if (!client.email) {
      showError("This client does not have an email address.");
      return;
    }

    const subject = emailTemplate?.subject ? replacePlaceholders(emailTemplate.subject, client) : '';
    let body = emailTemplate?.body ? replacePlaceholders(emailTemplate.body, client) : '';
    const cc = emailTemplate?.cc || '';

    if (emailTemplate?.attachments && emailTemplate.attachments.length > 0) {
      body += `\n\n\nAttachments (download links):`;
      emailTemplate.attachments.forEach(att => {
        body += `\n- ${att.file_name}:\n${att.file_url}`;
      });
    }

    if (body) {
      try {
        await navigator.clipboard.writeText(body);
        showSuccess("تم نسخ نص البريد الإلكتروني إلى الحافظة. يرجى لصقه في رسالتك.");
      } catch (err) {
        console.error("Failed to copy email body:", err);
        showError("Could not copy email body to clipboard.");
      }
    }

    const queryParts = [];
    if (subject) queryParts.push(`subject=${encodeURIComponent(subject)}`);
    if (cc) queryParts.push(`cc=${encodeURIComponent(cc)}`);
    
    const queryString = queryParts.join('&');
    const mailtoLink = `mailto:${client.email}?${queryString}`;
    
    await logActionAsFollowUp(client, 'email');
    window.open(mailtoLink, '_self');
    setIsEmailAlertDialogOpen(false); // Close alert after action
  };

  const createWhatsAppLink = (client: Client, template: MessageTemplate | undefined) => {
    if (!client.phone) return "#";
    const formattedPhone = formatWhatsAppNumber(client.phone);
    if (!template) return `https://wa.me/${formattedPhone}`;

    let text = template.body ? replacePlaceholders(template.body, client) : '';

    if (template.attachments && template.attachments.length > 0) {
      text += `\n\nيمكنك تحميل المرفقات من الروابط التالية:`;
      template.attachments.forEach(att => {
        text += `\n- ${att.file_name}:\n${att.file_url}`;
      });
    }
    
    const params = new URLSearchParams();
    params.append('text', text);

    return `https://wa.me/${formattedPhone}?${params.toString()}`;
  };

  const handleWhatsAppClick = async () => {
    if (!client.phone) {
      showError("This client does not have a phone number.");
      return;
    }
    const link = createWhatsAppLink(client, whatsappTemplate);
    await logActionAsFollowUp(client, 'whatsapp');
    window.open(link, '_blank', 'noopener,noreferrer');
    setIsWhatsAppAlertDialogOpen(false); // Close alert after action
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span> {/* Wrapped children in a span */}
              <span className="sr-only">فتح القائمة</span>
              <MoreHorizontal className="h-4 w-4" />
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsAddFollowUpDialogOpen(true); }}>
              <span className="flex items-center">
                  <PlusCircle className="ml-2 h-4 w-4" />
                  <span>إضافة متابعة</span>
              </span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsFollowUpHistoryDialogOpen(true); }}>
              <span className="flex items-center">
                  <History className="ml-2 h-4 w-4" />
                  <span>عرض السجل</span>
              </span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsClientNotesDialogOpen(true); }}>
            <span className="flex items-center">
                  <StickyNote className="ml-2 h-4 w-4" />
                  <span>الملاحظات</span>
              </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsEditClientDialogOpen(true); }}>
            <span className="flex items-center">
                  <Edit className="ml-2 h-4 w-4" />
                  <span>تعديل</span>
              </span>
          </DropdownMenuItem>
          {client.email && (
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsEmailAlertDialogOpen(true); }}>
              <span className="flex items-center">
                  <Mail className="ml-2 h-4 w-4" />
                  <span>إرسال بريد إلكتروني</span>
              </span>
            </DropdownMenuItem>
          )}
          {client.phone && (
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsWhatsAppAlertDialogOpen(true); }}>
              <span className="flex items-center">
                  <MessageSquare className="ml-2 h-4 w-4" />
                  <span>إرسال واتساب</span>
              </span>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onSelect={(e) => {
              e.preventDefault();
              setIsDeleteClientAlertOpen(true);
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

      {/* Render all controlled dialogs */}
      <AddFollowUpDialog 
        client={client} 
        open={isAddFollowUpDialogOpen} 
        onOpenChange={setIsAddFollowUpDialogOpen} 
      />
      <FollowUpHistoryDialog 
        client={client} 
        open={isFollowUpHistoryDialogOpen} 
        onOpenChange={setIsFollowUpHistoryDialogOpen} 
      />
      <ClientNotesDialog 
        client={client} 
        open={isClientNotesDialogOpen} 
        onOpenChange={setIsClientNotesDialogOpen} 
      />
      <EditClientDialog 
        client={client} 
        open={isEditClientDialogOpen} 
        onOpenChange={setIsEditClientDialogOpen} 
      />
      <DeleteClientAlert 
        clientId={client.id} 
        open={isDeleteClientAlertOpen} 
        onOpenChange={setIsDeleteClientAlertOpen}
        onConfirmDelete={() => {
            setIsDeleteClientAlertOpen(false);
        }}
      />
      <AlertDialog open={isEmailAlertDialogOpen} onOpenChange={setIsEmailAlertDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد إرسال البريد الإلكتروني</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم فتح برنامج البريد الإلكتروني الخاص بك. تم نسخ محتوى الرسالة إلى الحافظة، كل ما عليك هو لصقه في جسم الرسالة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleEmailClick}>
              متابعة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isWhatsAppAlertDialogOpen} onOpenChange={setIsWhatsAppAlertDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد إرسال رسالة واتساب</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد أنك تريد فتح واتساب لإرسال رسالة إلى هذا العميل؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleWhatsAppClick}>
              متابعة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};