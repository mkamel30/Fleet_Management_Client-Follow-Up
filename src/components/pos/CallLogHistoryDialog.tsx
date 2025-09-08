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
  posClient: PosClient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fetchCallLogs = async (posClientId: string): Promise<PosCallLog[]> => {
    const { data, error } = await supabase
        .from('pos_call_logs')
        .select('*')
        .eq('pos_client_id', posClientId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching call log history:", error);
        throw new Error(error.message);
    }
    return (data as PosCallLog[]) || [];
}

export const CallLogHistoryDialog = ({ posClient, open, onOpenChange }: CallLogHistoryDialogProps) => {
  const { data: callLogs, isLoading } = useQuery({
    queryKey: ["posCallLogs", posClient.id],
    queryFn: () => fetchCallLogs(posClient.id),
    enabled: !!posClient.id && open, // Only fetch when dialog is open
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle>سجل المكالمات للعميل: {posClient.client_name}</DialogTitle>
          <DialogDescription>
            هنا يمكنك رؤية جميع المكالمات السابقة لهذا العميل.
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
              {callLogs.map((callLog) => (
                <div key={callLog.id} className="border p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-gray-500">
                      {format(new Date(callLog.call_date), "d MMMM yyyy, h:mm a", { locale: arSA })}
                    </p>
                    {callLog.next_follow_up_date && (
                      <Badge variant="secondary">
                        متابعة: {format(new Date(callLog.next_follow_up_date), "d MMMM yyyy", { locale: arSA })}
                      </Badge>
                    )}
                  </div>
                  <p className="mb-2">{callLog.call_summary}</p>
                  <div className="text-xs text-gray-400">
                    بواسطة: {callLog.user_full_name || 'غير معروف'}
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