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
import { useState } from "react";
import { X } from "lucide-react";

const emailSchema = z.object({
  subject: z.string().min(1, "الموضوع مطلوب"),
  cc: z.string().optional(),
  body: z.string().min(1, "نص الرسالة مطلوب"),
  attachment: z.instanceof(FileList).optional(),
});

type EmailFormValues = z.infer<typeof emailSchema>;

const fetchEmailTemplate = async (userId: string): Promise<MessageTemplate | null> => {
  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .eq("user_id", userId)
    .eq("type", "email")
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }
  return data;
};

const upsertEmailTemplate = async ({ userId, values, currentTemplate }: { userId: string; values: EmailFormValues, currentTemplate: MessageTemplate | null }) => {
    let attachment_url = currentTemplate?.attachment_url || null;
    let attachment_name = currentTemplate?.attachment_name || null;
    const file = values.attachment?.[0];

    if (file) {
        if (currentTemplate?.attachment_url) {
            const oldFilePath = new URL(currentTemplate.attachment_url).pathname.split('/message_attachments/')[1];
            await supabase.storage.from('message_attachments').remove([oldFilePath]);
        }
        const filePath = `${userId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from('message_attachments').upload(filePath, file);
        if (uploadError) throw new Error(`Upload error: ${uploadError.message}`);
        const { data: urlData } = supabase.storage.from('message_attachments').getPublicUrl(filePath);
        attachment_url = urlData.publicUrl;
        attachment_name = file.name;
    }

    const { error } = await supabase.from("message_templates").upsert({
        user_id: userId,
        type: "email",
        subject: values.subject,
        cc: values.cc,
        body: values.body,
        attachment_url,
        attachment_name,
    }, { onConflict: 'user_id,type' });

    if (error) throw new Error(error.message);
};

const removeAttachment = async (template: MessageTemplate | null) => {
    if (!template?.attachment_url) return;
    const oldFilePath = new URL(template.attachment_url).pathname.split('/message_attachments/')[1];
    await supabase.storage.from('message_attachments').remove([oldFilePath]);
    await supabase.from('message_templates').update({ attachment_url: null, attachment_name: null }).eq('id', template.id);
}

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
        attachment: undefined,
    }
  });

  const mutation = useMutation({
    mutationFn: (values: EmailFormValues) => upsertEmailTemplate({ userId: session!.user!.id, values, currentTemplate: template }),
    onSuccess: () => {
      showSuccess("تم حفظ قالب البريد الإلكتروني بنجاح!");
      queryClient.invalidateQueries({ queryKey: ["emailTemplate"] });
      form.reset({ ...form.getValues(), attachment: undefined });
    },
    onError: (error) => {
      showError(`حدث خطأ: ${error.message}`);
    },
  });

  const removeAttachmentMutation = useMutation({
    mutationFn: () => removeAttachment(template),
    onSuccess: () => {
        showSuccess("تم حذف المرفق بنجاح.");
        queryClient.invalidateQueries({ queryKey: ["emailTemplate"] });
    },
    onError: (error) => {
        showError(`حدث خطأ أثناء حذف المرفق: ${error.message}`);
    }
  });

  const onSubmit = (values: EmailFormValues) => {
    if (!session?.user) return;
    mutation.mutate(values);
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>قالب البريد الإلكتروني</CardTitle>
        <CardDescription>
          قم بإعداد المحتوى الافتراضي لرسائل البريد الإلكتروني والمرفقات.
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
            <FormItem>
                <FormLabel>المرفق</FormLabel>
                {template?.attachment_name ? (
                    <div className="flex items-center justify-between p-2 border rounded-md">
                        <a href={template.attachment_url!} target="_blank" rel="noopener noreferrer" className="text-sm font-medium underline">
                            {template.attachment_name}
                        </a>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeAttachmentMutation.mutate()} disabled={removeAttachmentMutation.isPending}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ) : (
                    <FormField
                        control={form.control}
                        name="attachment"
                        render={({ field }) => (
                            <FormControl>
                                <Input type="file" onChange={(e) => field.onChange(e.target.files)} />
                            </FormControl>
                        )}
                    />
                )}
                <FormMessage />
            </FormItem>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "جاري الحفظ..." : "حفظ القالب"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};