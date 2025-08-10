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
import { X } from "lucide-react";

const whatsappSchema = z.object({
  body: z.string().min(1, "نص الرسالة مطلوب"),
  attachment: z.instanceof(FileList).optional(),
});

type WhatsAppFormValues = z.infer<typeof whatsappSchema>;

const fetchWhatsAppTemplate = async (userId: string): Promise<MessageTemplate | null> => {
  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .eq("user_id", userId)
    .eq("type", "whatsapp")
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }
  return data;
};

const upsertWhatsAppTemplate = async ({ userId, values, currentTemplate }: { userId: string; values: WhatsAppFormValues, currentTemplate: MessageTemplate | null }) => {
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
        type: "whatsapp",
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
    values: {
        body: template?.body || "",
        attachment: undefined,
    }
  });

  const mutation = useMutation({
    mutationFn: (values: WhatsAppFormValues) => upsertWhatsAppTemplate({ userId: session!.user!.id, values, currentTemplate: template }),
    onSuccess: () => {
      showSuccess("تم حفظ قالب واتساب بنجاح!");
      queryClient.invalidateQueries({ queryKey: ["whatsappTemplate"] });
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