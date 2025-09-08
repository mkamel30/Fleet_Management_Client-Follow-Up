import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PosClient, PosCallLog } from "@/types/pos";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface CallLogHistoryDialogProps {
  client: PosClient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fetchCallLogs = async (clientId: string): Promise<PosCallLog[]> => {
    const { data, error } = await supabase
        .from('pos_call_logs')
        .select('*')
        .eq('pos_client_id', clientId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching call log history:", error);
        throw new Error(error.message);
    }
    return data || [];
}

export const CallLogHistoryDialog = ({ client, open, onOpenChange }: CallLogHistoryDialogProps) => {
  const { data: callLogs, isLoading } = useQuery({
    queryKey: ["posCallLogs", client.id],
    queryFn: () => fetchCallLogs(client.id),
    enabled: !!client.id && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle>سجل المكالمات للعميل: {client.client_name}</DialogTitle>
          <DialogDescription>
            جميع المكالمات السابقة لهذا العميل.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex-1 overflow-y-auto pr-2">
          {isLoading ? (
            <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
          ) : callLogs && callLogs.length > 0 ? (
            <div className="space-y-4">
              {callLogs.map((log) => (
                <div key={log.id} className="border p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-gray-500">
                      {format(new Date(log.created_at), "d MMMM yyyy, h:mm a", { locale: arSA })}
                    </p>
                    <Badge>{log.status}</Badge>
                  </div>
                  <p className="mb-2">{log.feedback}</p>
                  <div className="text-xs text-gray-400 flex justify-between items-center">
                    <span>بواسطة: {log.user_full_name || 'غير معروف'}</span>
                    {log.next_follow_up_date && (
                        <span>
                            المتابعة التالية: {format(new Date(log.next_follow_up_date), "d MMMM yyyy", { locale: arSA })}
                        </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">لا يوجد سجل مكالمات لهذا العميل بعد.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};