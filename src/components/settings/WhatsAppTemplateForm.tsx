import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/SessionContext";
import { MessageTemplate, TemplateAttachment } from "@/types/template";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess, showError } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { X, Paperclip } from "lucide-react";

const whatsappSchema = z.object({
  body: z.string().min(1, "نص الرسالة مطلوب"),
  attachments: z.instanceof(FileList).optional(),
});

type WhatsAppFormValues = z.infer<typeof whatsappSchema>;

const fetchWhatsAppTemplate = async (userId: string): Promise<MessageTemplate | null> => {
  const { data, error } = await supabase
    .from("message_templates")
    .select("*, attachments:template_attachments(*)")
    .eq("user_id", userId)
    .eq("type", "whatsapp")
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data as MessageTemplate | null;
};

const upsertWhatsAppTemplate = async ({ userId, values }: { userId: string; values: WhatsAppFormValues }) => {
  const { data: templateData, error: templateError } = await supabase
    .from("message_templates")
    .upsert({ user_id: userId, type: "whatsapp", body: values.body }, { onConflict: 'user_id,type' })
    .select()
    .single();

  if (templateError) throw new Error(templateError.message);
  const templateId = templateData.id;

  const files = values.attachments;
  if (files && files.length > 0) {
    const newAttachments = Array.from(files).map(file => ({
      file,
      filePath: `${userId}/${templateId}/${Date.now()}_${file.name}`,
    }));

    const uploadPromises = newAttachments.map(({ file, filePath }) =>
      supabase.storage.from('message_attachments').upload(filePath, file)
    );
    const uploadResults = await Promise.all(uploadPromises);

    const uploadErrors = uploadResults.filter(result => result.error);
    if (uploadErrors.length > 0) throw new Error(`Failed to upload files: ${uploadErrors.map(e => e.error?.message).join(', ')}`);

    const attachmentRecords = newAttachments.map(({ file, filePath }) => {
      const { data: { publicUrl } } = supabase.storage.from('message_attachments').getPublicUrl(filePath);
      return { template_id: templateId, user_id: userId, file_name: file.name, file_url: publicUrl, file_path: filePath };
    });

    const { error: insertError } = await supabase.from('template_attachments').insert(attachmentRecords);
    if (insertError) throw new Error(insertError.message);
  }
};

const removeAttachment = async ({ attachmentId, filePath }: { attachmentId: string, filePath: string }) => {
  await supabase.storage.from('message_attachments').remove([filePath]);
  await supabase.from('template_attachments').delete().eq('id', attachmentId);
};

export const WhatsAppTemplateForm = () => {
  const { session } = useSession();
  const queryClient = useQueryClient();

  const { data: template, isLoading } = useQuery({
    queryKey: ["whatsappTemplate", session?.user?.id],
    queryFn: () => fetchWhatsAppTemplate(session!.user!.id),
    enabled: !!session?.user?.id,
  });

  const form = useForm<WhatsAppFormValues>({
    resolver: zodResolver(whatsappSchema),
    defaultValues: {
      body: "",
      attachments: undefined,
    },
  });

  useEffect(() => {
    if (template) {
      form.reset({
        body: template.body || "",
      });
    }
  }, [template, form]);

  const mutation = useMutation({
    mutationFn: (values: WhatsAppFormValues) => upsertWhatsAppTemplate({ userId: session!.user!.id, values }),
    onSuccess: () => {
      showSuccess("تم حفظ قالب واتساب بنجاح!");
      queryClient.invalidateQueries({ queryKey: ["whatsappTemplate", session?.user?.id] });
      form.reset({ ...form.getValues(), attachments: undefined });
    },
    onError: (error) => showError(`حدث خطأ: ${error.message}`),
  });

  const removeAttachmentMutation = useMutation({
    mutationFn: removeAttachment,
    onSuccess: () => {
      showSuccess("تم حذف المرفق بنجاح.");
      queryClient.invalidateQueries({ queryKey: ["whatsappTemplate", session?.user?.id] });
    },
    onError: (error) => showError(`حدث خطأ أثناء حذف المرفق: ${error.message}`),
  });

  const onSubmit = (values: WhatsAppFormValues) => {
    mutation.mutate(values);
  };

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>قالب واتساب</CardTitle>
        <CardDescription>
          {"قم بإعداد المحتوى الافتراضي لرسائل واتساب والمرفقات. يمكنك استخدام متغيرات مثل {company_name} و {contact_person} ليتم استبدالها تلقائيًا."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField control={form.control} name="body" render={({ field }) => ( <FormItem> <FormLabel>نص الرسالة</FormLabel> <FormControl> <Textarea rows={8} placeholder="اكتب نص رسالتك هنا..." {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
            
            <div className="space-y-2">
              <FormLabel>المرفقات الحالية</FormLabel>
              {template?.attachments && template.attachments.length > 0 ? (
                <div className="space-y-2">
                  {template.attachments.map((att: TemplateAttachment) => (
                    <div key={att.id} className="flex items-center justify-between p-2 border rounded-md text-sm">
                      <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline">
                        <Paperclip className="h-4 w-4" /> {att.file_name}
                      </a>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeAttachmentMutation.mutate({ attachmentId: att.id, filePath: att.file_path })} disabled={removeAttachmentMutation.isPending}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">لا توجد مرفقات حالية.</p>
              )}
            </div>

            <FormField control={form.control} name="attachments" render={({ field }) => ( <FormItem> <FormLabel>إضافة مرفقات جديدة</FormLabel> <FormControl> <Input type="file" multiple onChange={(e) => field.onChange(e.target.files)} /> </FormControl> <FormMessage /> </FormItem> )}/>

            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "جاري الحفظ..." : "حفظ القالب"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};