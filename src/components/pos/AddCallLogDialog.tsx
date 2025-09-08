import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/SessionContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { PosClient } from "@/types/pos";
import { DateInputPicker } from "@/components/ui/DateInputPicker";

const callLogSchema = z.object({
  call_summary: z.string().min(1, { message: "يجب إدخال ملخص المكالمة" }),
  next_follow_up_date: z.date().optional(),
});

type CallLogFormValues = z.infer<typeof callLogSchema>;

interface AddCallLogDialogProps {
  posClient: PosClient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddCallLogDialog = ({ posClient, open, onOpenChange }: AddCallLogDialogProps) => {
  const { session } = useSession();
  const queryClient = useQueryClient();

  const form = useForm<CallLogFormValues>({
    resolver: zodResolver(callLogSchema),
    defaultValues: {
      call_summary: "",
      next_follow_up_date: undefined,
    }
  });

  const onSubmit = async (values: CallLogFormValues) => {
    if (!session?.user) return;

    const localUserName = localStorage.getItem(`local_user_name_${session.user.id}`) || session.user.email || "مستخدم غير معروف";

    const { error } = await supabase.from('pos_call_logs').insert({
        pos_client_id: posClient.id,
        user_id: session.user.id,
        call_summary: values.call_summary,
        next_follow_up_date: values.next_follow_up_date ? values.next_follow_up_date.toISOString().split('T')[0] : null,
        user_full_name: localUserName,
    });

    if (error) {
      toast.error("حدث خطأ أثناء تسجيل المكالمة: " + error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["posClients"] });
      queryClient.invalidateQueries({ queryKey: ["posCallLogs", posClient.id] });
      
      toast.success("تم تسجيل المكالمة بنجاح!");
      form.reset();
      onOpenChange(false); // Close dialog
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>إضافة مكالمة للعميل: {posClient.client_name}</DialogTitle>
          <DialogDescription>
            سجل تفاصيل المكالمة هنا.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="call_summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملخص المكالمة</FormLabel>
                  <FormControl>
                    <Textarea placeholder="اكتب ملخص المكالمة هنا..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="next_follow_up_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>تاريخ المتابعة التالية (اختياري)</FormLabel>
                  <FormControl>
                    <DateInputPicker
                      value={field.value}
                      onChange={field.onChange}
                      disabled={(date) => date < new Date()}
                      placeholder="DD-MM-YYYY"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
                <Button type="submit">حفظ المكالمة</Button>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">إلغاء</Button>
                </DialogClose>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};