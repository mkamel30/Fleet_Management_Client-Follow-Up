import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Client } from "@/types/client";
import { FollowUp } from "@/types/followup";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface FollowUpHistoryDialogProps {
  client: Client;
  children: React.ReactNode;
}

const fetchFollowUps = async (clientId: string): Promise<FollowUp[]> => {
    const { data, error } = await supabase
        .from('follow_ups')
        .select('*, profiles!left(full_name)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching follow-up history:", error);
        throw new Error(error.message);
    }
    return (data as FollowUp[]) || [];
}

export const FollowUpHistoryDialog = ({ client, children }: FollowUpHistoryDialogProps) => {
  const { data: followUps, isLoading } = useQuery({
    queryKey: ["followUps", client.id],
    queryFn: () => fetchFollowUps(client.id),
    enabled: !!client.id,
  });

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>سجل المتابعة للعميل: {client.company_name}</DialogTitle>
          <DialogDescription>
            هنا يمكنك رؤية جميع المتابعات السابقة لهذا العميل.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
          {isLoading ? (
            <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
          ) : followUps && followUps.length > 0 ? (
            <div className="space-y-4">
              {followUps.map((followUp) => (
                <div key={followUp.id} className="border p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-gray-500">
                      {format(new Date(followUp.created_at), "d MMMM yyyy, h:mm a", { locale: arSA })}
                    </p>
                    <Badge>{followUp.status}</Badge>
                  </div>
                  <p className="mb-2">{followUp.feedback}</p>
                  <div className="text-xs text-gray-400 flex justify-between items-center">
                    <span>بواسطة: {followUp.profiles?.full_name || 'غير معروف'}</span>
                    {followUp.next_follow_up_date && (
                        <span>
                            المتابعة التالية: {format(new Date(followUp.next_follow_up_date), "d MMMM yyyy", { locale: arSA })}
                        </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">لا يوجد سجل متابعة لهذا العميل بعد.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};