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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess, showError } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useEffect } from "react";
import { X } from "lucide-react";

const whatsappSchema = z.object({
  body: z.string().min(1, "نص الرسالة مطلوب"),
  attachment: z.instanceof(FileList).optional(),
});

type WhatsAppFormValues = z.infer<typeof whatsappSchema>;

const fetchWhatsAppTemplate = async (userId: string): Promise<MessageTemplate | null> => {
  const { data, error } = await supabase
    .from("message_templates")
    .select("*, attachments:template_attachments(*)")
    .eq("user_id", userId)
    .eq("type", "whatsapp")
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }
  return data as MessageTemplate | null;
};

const upsertWhatsAppTemplate = async ({ userId, values, currentTemplate }: { userId: string; values: WhatsAppFormValues, currentTemplate: MessageTemplate | null }) => {
    const { data: templateData, error: upsertError } = await supabase.from("message_templates").upsert({
        user_id: userId,
        type: "whatsapp",
        body: values.body,
    }, { onConflict: 'user_id,type' }).select().single();

    if (upsertError) throw new Error(`Template upsert error: ${upsertError.message}`);
    if (!templateData) throw new Error("Failed to upsert template data.");

    const templateId = templateData.id;
    const file = values.attachment?.[0];

    if (file) {
        if (currentTemplate?.attachments && currentTemplate.attachments.length > 0) {
            const oldAttachment = currentTemplate.attachments[0];
            await supabase.storage.from('message_attachments').remove([oldAttachment.file_path]);
            await supabase.from('template_attachments').delete().eq('id', oldAttachment.id);
        }

        const filePath = `${userId}/${templateId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from('message_attachments').upload(filePath, file);
        if (uploadError) throw new Error(`Upload error: ${uploadError.message}`);
        
        const { data: urlData } = supabase.storage.from('message_attachments').getPublicUrl(filePath);
        
        const { error: attachmentError } = await supabase.from('template_attachments').insert({
            template_id: templateId,
            user_id: userId,
            file_name: file.name,
            file_url: urlData.publicUrl,
            file_path: filePath,
        });

        if (attachmentError) throw new Error(`Attachment insert error: ${attachmentError.message}`);
    }
};

const removeAttachment = async (template: MessageTemplate | null) => {
    if (!template?.attachments || template.attachments.length === 0) return;
    
    const attachment = template.attachments[0];
    
    await supabase.storage.from('message_attachments').remove([attachment.file_path]);
    await supabase.from('template_attachments').delete().eq('id', attachment.id);
}

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
        attachment: undefined,
    }
  });

  useEffect(() => {
    if (template) {
        form.reset({
            body: template.body || "",
        });
    }
  }, [template, form]);

  const mutation = useMutation({
    mutationFn: (values: WhatsAppFormValues) => upsertWhatsAppTemplate({ userId: session!.user!.id, values, currentTemplate: template }),
    onSuccess: () => {
      showSuccess("تم حفظ قالب واتساب بنجاح!");
      queryClient.invalidateQueries({ queryKey: ["whatsappTemplate"] });
      queryClient.invalidateQueries({ queryKey: ["messageTemplates"] });
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
        queryClient.invalidateQueries({ queryKey: ["whatsappTemplate"] });
        queryClient.invalidateQueries({ queryKey: ["messageTemplates"] });
    },
    onError: (error) => {
        showError(`حدث خطأ أثناء حذف المرفق: ${error.message}`);
    }
  });

  const onSubmit = (values: WhatsAppFormValues) => {
    if (!session?.user) return;
    mutation.mutate(values);
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>قالب واتساب</CardTitle>
        <CardDescription>
          قم بإعداد المحتوى الافتراضي لرسائل واتساب والمرفقات.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                {template?.attachments && template.attachments.length > 0 ? (
                    <div className="flex items-center justify-between p-2 border rounded-md">
                        <a href={template.attachments[0].file_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium underline">
                            {template.attachments[0].file_name}
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