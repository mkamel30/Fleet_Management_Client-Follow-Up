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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  feedback: z.string().min(1, { message: "يجب إدخال ملاحظات" }),
  status: z.string({ required_error: "الحالة مطلوبة" }),
  next_follow_up_date: z.date().optional(),
});

type CallLogFormValues = z.infer<typeof callLogSchema>;

interface AddCallLogDialogProps {
  client: PosClient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddCallLogDialog = ({ client, open, onOpenChange }: AddCallLogDialogProps) => {
  const { session } = useSession();
  const queryClient = useQueryClient();

  const form = useForm<CallLogFormValues>({
    resolver: zodResolver(callLogSchema),
    defaultValues: {
      feedback: "",
      status: undefined,
      next_follow_up_date: undefined,
    },
  });

  const status = form.watch("status");

  const onSubmit = async (values: CallLogFormValues) => {
    if (!session?.user) return;

    const localUserName = localStorage.getItem(`local_user_name_${session.user.id}`) || session.user.email || "مستخدم غير معروف";

    const { error } = await supabase.from("pos_call_logs").insert({
      pos_client_id: client.id,
      user_id: session.user.id,
      user_full_name: localUserName,
      feedback: values.feedback,
      status: values.status,
      next_follow_up_date: values.next_follow_up_date ? values.next_follow_up_date.toISOString().split('T')[0] : null,
    });

    if (error) {
      toast.error("حدث خطأ أثناء تسجيل المكالمة: " + error.message);
    } else {
      toast.success("تم تسجيل المكالمة بنجاح!");
      queryClient.invalidateQueries({ queryKey: ["posCallLogs", client.id] });
      queryClient.invalidateQueries({ queryKey: ["posClients"] }); // Invalidate posClients to refresh status badge
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>إضافة مكالمة للعميل: {client.client_name}</DialogTitle>
          <DialogDescription>
            سجل تفاصيل المكالمة هنا.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="feedback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الملاحظات / نتيجة المكالمة</FormLabel>
                  <FormControl>
                    <Textarea placeholder="اكتب ملاحظاتك هنا..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>حالة المكالمة</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الحالة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="مهتم">مهتم</SelectItem>
                      <SelectItem value="غير مهتم">غير مهتم</SelectItem>
                      <SelectItem value="متابعة لاحقاً">متابعة لاحقاً</SelectItem>
                      <SelectItem value="تم الإرسال للتعاقد">تم الإرسال للتعاقد</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {status === "متابعة لاحقاً" && (
              <FormField
                control={form.control}
                name="next_follow_up_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>تاريخ المتابعة التالية</FormLabel>
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
            )}
            <DialogFooter>
                <Button type="submit">حفظ</Button>
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