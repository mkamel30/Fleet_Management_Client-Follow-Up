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
  FormDescription,
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
import { useEffect } from "react";
import { X } from "lucide-react";

const emailSchema = z.object({
  subject: z.string().min(1, "الموضوع مطلوب"),
  cc: z.string().optional(),
  body: z.string().min(1, "نص الرسالة مطلوب"),
  attachments: z.instanceof(FileList).optional(),
});

type EmailFormValues = z.infer<typeof emailSchema>;

const fetchEmailTemplate = async (): Promise<MessageTemplate | null> => {
  const { data, error } = await supabase
    .from("message_templates")
    .select("*, attachments:template_attachments(*)")
    .eq("type", "email")
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }
  return data as MessageTemplate | null;
};

const upsertEmailTemplate = async ({ userId, values, existingTemplateId }: { userId: string; values: EmailFormValues, existingTemplateId: string | null }) => {
    const templatePayload = {
        user_id: userId,
        type: "email" as const,
        subject: values.subject,
        cc: values.cc,
        body: values.body,
    };

    let templateData;

    if (existingTemplateId) {
        const { data, error } = await supabase
            .from("message_templates")
            .update(templatePayload)
            .eq("id", existingTemplateId)
            .select()
            .single();
        if (error) throw new Error(`Template update error: ${error.message}`);
        templateData = data;
    } else {
        const { data, error } = await supabase
            .from("message_templates")
            .insert(templatePayload)
            .select()
            .single();
        if (error) throw new Error(`Template insert error: ${error.message}`);
        templateData = data;
    }
    
    if (!templateData) throw new Error("Failed to save template data.");

    const templateId = templateData.id;
    const files = values.attachments;

    if (files && files.length > 0) {
        const uploadPromises = Array.from(files).map(async (file) => {
            const filePath = `${userId}/${templateId}/${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabase.storage.from('message_attachments').upload(filePath, file);
            if (uploadError) throw new Error(`Upload error for ${file.name}: ${uploadError.message}`);
            
            const { data: urlData } = supabase.storage.from('message_attachments').getPublicUrl(filePath);
            
            return {
                template_id: templateId,
                user_id: userId,
                file_name: file.name,
                file_url: urlData.publicUrl,
                file_path: filePath,
            };
        });

        const newAttachments = await Promise.all(uploadPromises);

        const { error: attachmentError } = await supabase.from('template_attachments').insert(newAttachments);
        if (attachmentError) throw new Error(`Attachment insert error: ${attachmentError.message}`);
    }
};

const removeAttachment = async ({ attachmentId, filePath }: { attachmentId: string, filePath: string }) => {
    const { error: storageError } = await supabase.storage.from('message_attachments').remove([filePath]);
    if (storageError) throw new Error(`Storage deletion error: ${storageError.message}`);

    const { error: dbError } = await supabase.from('template_attachments').delete().eq('id', attachmentId);
    if (dbError) throw new Error(`Database deletion error: ${dbError.message}`);
}

export const EmailTemplateForm = () => {
  const { session } = useSession();
  const queryClient = useQueryClient();

  const { data: template, isLoading } = useQuery({
    queryKey: ["emailTemplate"],
    queryFn: fetchEmailTemplate,
    enabled: !!session?.user?.id,
  });

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
        subject: "",
        cc: "",
        body: "",
        attachments: undefined,
    }
  });

  useEffect(() => {
    if (template) {
        form.reset({
            subject: template.subject || "",
            cc: template.cc || "",
            body: template.body || "",
        });
    }
  }, [template, form]);

  const mutation = useMutation({
    mutationFn: (values: EmailFormValues) => upsertEmailTemplate({ userId: session!.user!.id, values, existingTemplateId: template?.id || null }),
    onSuccess: () => {
      showSuccess("تم حفظ قالب البريد الإلكتروني بنجاح!");
      queryClient.invalidateQueries({ queryKey: ["emailTemplate"] });
      queryClient.invalidateQueries({ queryKey: ["messageTemplates"] });
      form.setValue('attachments', undefined);
    },
    onError: (error) => {
      showError(`حدث خطأ: ${error.message}`);
    },
  });

  const removeAttachmentMutation = useMutation({
    mutationFn: removeAttachment,
    onSuccess: () => {
        showSuccess("تم حذف المرفق بنجاح.");
        queryClient.invalidateQueries({ queryKey: ["emailTemplate"] });
        queryClient.invalidateQueries({ queryKey: ["messageTemplates"] });
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
                    <Textarea rows={8} placeholder="مثال: السادة/ {company_name}، تحية طيبة وبعد..." {...field} />
                  </FormControl>
                  <FormDescription>
                    يمكنك استخدام المتغيرات {`{company_name}`} و {`{contact_person}`} وسيتم استبدالها تلقائيًا.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem>
                <FormLabel>المرفقات</FormLabel>
                <div className="space-y-2">
                    {template?.attachments && template.attachments.map(att => (
                        <div key={att.id} className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                            <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium underline truncate">
                                {att.file_name}
                            </a>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeAttachmentMutation.mutate({ attachmentId: att.id, filePath: att.file_path })} disabled={removeAttachmentMutation.isPending}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
                <FormField
                    control={form.control}
                    name="attachments"
                    render={({ field }) => (
                        <FormControl className="mt-2">
                            <Input type="file" multiple onChange={(e) => field.onChange(e.target.files)} />
                        </FormControl>
                    )}
                />
                <FormDescription>
                    لإضافة مرفقات جديدة، اختر الملفات من هنا.
                </FormDescription>
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