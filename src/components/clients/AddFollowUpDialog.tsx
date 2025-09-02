import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Client } from "@/types/client";
import { DateInputPicker } from "@/components/ui/DateInputPicker";

const followUpSchema = z.object({
  feedback: z.string().min(1, { message: "يجب إدخال ملاحظات" }),
  status: z.string({ required_error: "الحالة مطلوبة" }),
  follow_up_date: z.date({ required_error: "تاريخ المتابعة مطلوب" }),
  next_follow_up_date: z.date().optional(),
});

type FollowUpFormValues = z.infer<typeof followUpSchema>;

interface AddFollowUpDialogProps {
  client: Client;
  children: React.ReactNode;
}

const generateOutlookLink = (client: Client, values: FollowUpFormValues) => {
    if (!values.next_follow_up_date) return "";
    const subject = `متابعة مع العميل: ${client.company_name}`;
    const startDate = new Date(values.next_follow_up_date);
    startDate.setHours(9, 0, 0, 0); // Default to 9 AM
    const endDate = new Date(startDate);
    endDate.setHours(10, 0, 0, 0); // 1-hour duration

    const body = `
        متابعة مجدولة مع العميل: ${client.company_name}
        الشخص المسؤول: ${client.contact_person || 'غير محدد'}
        رقم الهاتف: ${client.phone || 'غير محدد'}
        
        آخر المستجدات:
        ${values.feedback}
    `.trim();

    const url = new URL("https://outlook.live.com/calendar/0/deeplink/compose");
    url.searchParams.append('path', '/calendar/action/compose');
    url.searchParams.append('rru', 'addevent');
    url.searchParams.append('subject', subject);
    url.searchParams.append('startdt', startDate.toISOString());
    url.searchParams.append('enddt', endDate.toISOString());
    url.searchParams.append('body', body);

    return url.toString();
}

export const AddFollowUpDialog = ({ client, children }: AddFollowUpDialogProps) => {
  const [open, setOpen] = useState(false);
  const { session } = useSession();
  const queryClient = useQueryClient();

  const form = useForm<FollowUpFormValues>({
    resolver: zodResolver(followUpSchema),
    defaultValues: {
        feedback: "",
        status: undefined,
        follow_up_date: new Date(),
        next_follow_up_date: undefined,
    }
  });

  const status = form.watch("status");

  const onSubmit = async (values: FollowUpFormValues) => {
    if (!session?.user) return;

    const localUserName = localStorage.getItem(`local_user_name_${session.user.id}`) || session.user.email || "مستخدم غير معروف";

    const { error } = await supabase.rpc('add_follow_up_and_update_client', {
        p_client_id: client.id,
        p_user_id: session.user.id,
        p_feedback: values.feedback,
        p_status: values.status,
        p_next_follow_up_date: values.next_follow_up_date ? values.next_follow_up_date.toISOString() : null,
        p_created_at: values.follow_up_date.toISOString(),
        p_user_full_name: localUserName,
    });

    if (error) {
      toast.error("حدث خطأ أثناء تسجيل المتابعة: " + error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["followUps", client.id] });
      
      if (values.next_follow_up_date) {
        const calendarLink = generateOutlookLink(client, values);
        toast.success("تم تسجيل المتابعة بنجاح!", {
            action: {
                label: "إضافة للتقويم",
                onClick: () => window.open(calendarLink, '_blank')
            },
            duration: 10000,
        });
      } else {
        toast.success("تم تسجيل المتابعة بنجاح!");
      }
      
      form.reset();
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>إضافة متابعة للعميل: {client.company_name}</DialogTitle>
          <DialogDescription>
            سجل تفاصيل المتابعة هنا.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
                control={form.control}
                name="follow_up_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>تاريخ المتابعة</FormLabel>
                    <FormControl>
                      <DateInputPicker
                        value={field.value}
                        onChange={field.onChange}
                        disabled={(date) => date > new Date()}
                        placeholder="YYYY-MM-DD"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <FormField
              control={form.control}
              name="feedback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الملاحظات / نتيجة المتابعة</FormLabel>
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
                  <FormLabel>تحديث حالة العميل</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الحالة الجديدة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="متابعة مستمرة">متابعة مستمرة</SelectItem>
                      <SelectItem value="تم التعاقد">تم التعاقد</SelectItem>
                      <SelectItem value="لا يرغب">لا يرغب</SelectItem>
                      <SelectItem value="تواصل لاحقاً">تواصل لاحقاً</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {(status === "متابعة مستمرة" || status === "تواصل لاحقاً") && (
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
                        placeholder="YYYY-MM-DD"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <DialogFooter>
                <Button type="submit">حفظ المتابعة</Button>
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