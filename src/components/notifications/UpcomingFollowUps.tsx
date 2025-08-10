import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Trash2 } from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import { arSA } from "date-fns/locale";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/SessionContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { showError, showSuccess } from "@/utils/toast";
import { Separator } from "@/components/ui/separator";

interface UpcomingFollowUp {
  id: string;
  client_id: string;
  next_follow_up_date: string;
  client: {
    company_name: string;
  }[] | null;
}

const fetchUpcomingFollowUps = async (userId: string): Promise<UpcomingFollowUp[]> => {
  const { data, error } = await supabase
    .from('follow_ups')
    .select(`
      id,
      client_id,
      next_follow_up_date,
      client:clients ( company_name )
    `)
    .eq('user_id', userId)
    .not('next_follow_up_date', 'is', null)
    .gte('next_follow_up_date', new Date().toISOString().split('T')[0]) // From today onwards
    .order('next_follow_up_date', { ascending: true });

  if (error) {
    console.error("Error fetching upcoming follow-ups:", error);
    throw new Error(error.message);
  }
  
  if (!data) return [];

  // Ensure only the soonest follow-up per client is shown
  const uniqueFollowUps = new Map<string, UpcomingFollowUp>();
  for (const followUp of data as UpcomingFollowUp[]) {
    if (followUp.client_id && !uniqueFollowUps.has(followUp.client_id)) {
      uniqueFollowUps.set(followUp.client_id, followUp);
    }
  }

  return Array.from(uniqueFollowUps.values()).filter(f => f.client && f.client.length > 0);
};

export const UpcomingFollowUps = () => {
  const { session } = useSession();
  const queryClient = useQueryClient();

  const { data: followUps, isLoading } = useQuery({
    queryKey: ['upcomingFollowUps', session?.user?.id],
    queryFn: () => fetchUpcomingFollowUps(session!.user!.id),
    enabled: !!session?.user?.id,
    staleTime: 1000 * 60 * 5, // Refetch every 5 minutes
  });

  const clearMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('follow_ups')
        .update({ next_follow_up_date: null })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upcomingFollowUps'] });
      showSuccess("تم مسح الإشعارات.");
    },
    onError: (error: Error) => {
      showError(`فشل مسح الإشعارات: ${error.message}`);
    }
  });

  const handleClearAll = () => {
    if (followUps && followUps.length > 0) {
      const ids = followUps.map(f => f.id);
      clearMutation.mutate(ids);
    }
  };

  const getRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'اليوم';
    if (isTomorrow(date)) return 'غداً';
    return format(date, 'eeee, d MMMM', { locale: arSA });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {followUps && followUps.length > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs">
              {followUps.length}
            </Badge>
          )}
          <span className="sr-only">فتح الإشعارات</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" dir="rtl">
        <div className="p-4">
          <h4 className="font-medium leading-none">متابعات قادمة</h4>
          <p className="text-sm text-muted-foreground">
            لديك {followUps?.length || 0} متابعة قادمة.
          </p>
        </div>
        <div className="grid gap-2 max-h-80 overflow-y-auto p-4 pt-0">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : followUps && followUps.length > 0 ? (
            followUps.map((followUp) => (
              <div
                key={followUp.id}
                className="mb-2 grid grid-cols-[25px_1fr] items-start pb-4 last:mb-0 last:pb-0"
              >
                <span className="flex h-2 w-2 translate-y-1 rounded-full bg-sky-500" />
                <div className="grid gap-1">
                  <p className="text-sm font-medium leading-none">
                    {followUp.client?.[0]?.company_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {getRelativeDate(followUp.next_follow_up_date)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              لا توجد متابعات قادمة.
            </p>
          )}
        </div>
        {followUps && followUps.length > 0 && (
            <>
                <Separator />
                <div className="p-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-red-500 hover:text-red-600"
                        onClick={handleClearAll}
                        disabled={clearMutation.isPending}
                    >
                        <Trash2 className="ml-2 h-4 w-4" />
                        {clearMutation.isPending ? "جاري المسح..." : "مسح الكل"}
                    </Button>
                </div>
            </>
        )}
      </PopoverContent>
    </Popover>
  );
};