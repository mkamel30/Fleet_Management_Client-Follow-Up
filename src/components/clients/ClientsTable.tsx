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
import { Client } from "@/types/client";
import { MessageTemplate } from "@/types/template";
import { Skeleton } from "@/components/ui/skeleton";
import { MoreHorizontal, Edit, Trash2, Mail, MessageSquare, PlusCircle, History, ArrowUp, ArrowDown, StickyNote } from "lucide-react";
import { EditClientDialog } from "./EditClientDialog";
import { DeleteClientAlert } from "./DeleteClientAlert";
import { AddFollowUpDialog } from "./AddFollowUpDialog";
import { FollowUpHistoryDialog } from "./FollowUpHistoryDialog";
import { ClientNotesDialog } from "./ClientNotesDialog";
import { showError, showSuccess } from "@/utils/toast";

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
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  // State for managing dialogs
  const [isAddFollowUpDialogOpen, setIsAddFollowUpDialogOpen] = useState(false);
  const [isFollowUpHistoryDialogOpen, setIsFollowUpHistoryDialogOpen] = useState(false);
  const [isClientNotesDialogOpen, setIsClientNotesDialogOpen] = useState(false);
  const [isEditClientDialogOpen, setIsEditClientDialogOpen] = useState(false);
  const [isDeleteClientAlertOpen, setIsDeleteClientAlertOpen] = useState(false);
  const [isEmailAlertDialogOpen, setIsEmailAlertDialogOpen] = useState(false);
  const [isWhatsAppAlertDialogOpen, setIsWhatsAppAlertDialogOpen] = useState(false);

  const [selectedClientForAction, setSelectedClientForAction] = useState<Client | null>(null);

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

  const logActionAsFollowUp = async (client: Client, type: 'email' | 'whatsapp') => {
    if (!session?.user) return;

    const feedbackMessage = type === 'email' 
        ? 'تم إرسال بريد إلكتروني باستخدام القالب.' 
        : 'تم إرسال رسالة واتساب باستخدام القالب.';

    const { error } = await supabase.from('follow_ups').insert({
        client_id: client.id,
        user_id: session.user.id,
        feedback: feedbackMessage,
        status: client.status || 'متابعة مستمرة',
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

  const handleEmailClick = async (client: Client) => {
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

  const handleWhatsAppClick = async (client: Client) => {
    if (!client.phone) {
      showError("This client does not have a phone number.");
      return;
    }
    const link = createWhatsAppLink(client, whatsappTemplate);
    await logActionAsFollowUp(client, 'whatsapp');
    window.open(link, '_blank', 'noopener,noreferrer');
    setIsWhatsAppAlertDialogOpen(false); // Close alert after action
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">فتح القائمة</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setSelectedClientForAction(client); setIsAddFollowUpDialogOpen(true); }}>
                            <span className="flex items-center">
                                <PlusCircle className="ml-2 h-4 w-4" />
                                <span>إضافة متابعة</span>
                            </span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setSelectedClientForAction(client); setIsFollowUpHistoryDialogOpen(true); }}>
                            <span className="flex items-center">
                                <History className="ml-2 h-4 w-4" />
                                <span>عرض السجل</span>
                            </span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setSelectedClientForAction(client); setIsClientNotesDialogOpen(true); }}>
                          <span className="flex items-center">
                                <StickyNote className="ml-2 h-4 w-4" />
                                <span>الملاحظات</span>
                            </span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setSelectedClientForAction(client); setIsEditClientDialogOpen(true); }}>
                          <span className="flex items-center">
                                <Edit className="ml-2 h-4 w-4" />
                                <span>تعديل</span>
                            </span>
                        </DropdownMenuItem>
                        {client.email && (
                          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setSelectedClientForAction(client); setIsEmailAlertDialogOpen(true); }}>
                            <span className="flex items-center">
                                <Mail className="ml-2 h-4 w-4" />
                                <span>إرسال بريد إلكتروني</span>
                            </span>
                          </DropdownMenuItem>
                        )}
                        {client.phone && (
                          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setSelectedClientForAction(client); setIsWhatsAppAlertDialogOpen(true); }}>
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
                            setSelectedClientForAction(client);
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

      {selectedClientForAction && (
        <>
          <AddFollowUpDialog 
            client={selectedClientForAction} 
            open={isAddFollowUpDialogOpen} 
            onOpenChange={setIsAddFollowUpDialogOpen} 
          />
          <FollowUpHistoryDialog 
            client={selectedClientForAction} 
            open={isFollowUpHistoryDialogOpen} 
            onOpenChange={setIsFollowUpHistoryDialogOpen} 
          />
          <ClientNotesDialog 
            client={selectedClientForAction} 
            open={isClientNotesDialogOpen} 
            onOpenChange={setIsClientNotesDialogOpen} 
          />
          <EditClientDialog 
            client={selectedClientForAction} 
            open={isEditClientDialogOpen} 
            onOpenChange={setIsEditClientDialogOpen} 
          />
          <DeleteClientAlert 
            clientId={selectedClientForAction.id} 
            open={isDeleteClientAlertOpen} 
            onOpenChange={setIsDeleteClientAlertOpen}
            onConfirmDelete={() => {
                setIsDeleteClientAlertOpen(false);
                setSelectedClientForAction(null);
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
                <AlertDialogAction onClick={() => handleEmailClick(selectedClientForAction)}>
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
                <AlertDialogAction onClick={() => handleWhatsAppClick(selectedClientForAction)}>
                  متابعة
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
};