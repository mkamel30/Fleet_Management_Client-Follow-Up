import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/SessionContext";
import { MessageTemplate } from "@/types/template";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess, showError } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";

const emailSchema = z.object({
  subject: z.string().min(1, "الموضوع مطلوب"),
  cc: z.string().optional(),
  body: z.string().min(1, "نص الرسالة مطلوب"),
});

type EmailFormValues = z.infer<typeof emailSchema>;

const fetchEmailTemplate = async (userId: string): Promise<MessageTemplate | null> => {
  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .eq("user_id", userId)
    .eq("type", "email")
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116: no rows found
    throw new Error(error.message);
  }
  return data;
};

const upsertEmailTemplate = async ({ userId, values }: { userId: string; values: EmailFormValues }) => {
  const { error } = await supabase.from("message_templates").upsert({
    user_id: userId,
    type: "email",
    ...values,
  }, { onConflict: 'user_id,type' });

  if (error) {
    throw new Error(error.message);
  }
};

export const EmailTemplateForm = () => {
  const { session } = useSession();
  const queryClient = useQueryClient();

  const { data: template, isLoading } = useQuery({
    queryKey: ["emailTemplate", session?.user?.id],
    queryFn: () => fetchEmailTemplate(session!.user!.id),
    enabled: !!session?.user?.id,
  });

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    values: {
        subject: template?.subject || "",
        cc: template?.cc || "",
        body: template?.body || "",
    }
  });

  const mutation = useMutation({
    mutationFn: upsertEmailTemplate,
    onSuccess: () => {
      showSuccess("تم حفظ قالب البريد الإلكتروني بنجاح!");
      queryClient.invalidateQueries({ queryKey: ["emailTemplate"] });
    },
    onError: (error) => {
      showError(`حدث خطأ: ${error.message}`);
    },
  });

  const onSubmit = (values: EmailFormValues) => {
    if (!session?.user) return;
    mutation.mutate({ userId: session.user.id, values });
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>قالب البريد الإلكتروني</CardTitle>
        <CardDescription>
          قم بإعداد المحتوى الافتراضي لرسائل البريد الإلكتروني.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الموضوع</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: عرض أسعار خدمات الوقود" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نسخة إلى (CC)</FormLabel>
                  <FormControl>
                    <Input placeholder="cc@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نص الرسالة</FormLabel>
                  <FormControl>
                    <Textarea rows={8} placeholder="اكتب نص رسالتك هنا..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "جاري الحفظ..." : "حفظ القالب"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};