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

const whatsappSchema = z.object({
  body: z.string().min(1, "نص الرسالة مطلوب"),
});

type WhatsAppFormValues = z.infer<typeof whatsappSchema>;

const fetchWhatsAppTemplate = async (userId: string): Promise<MessageTemplate | null> => {
  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .eq("user_id", userId)
    .eq("type", "whatsapp")
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116: no rows found
    throw new Error(error.message);
  }
  return data;
};

const upsertWhatsAppTemplate = async ({ userId, values }: { userId: string; values: WhatsAppFormValues }) => {
  const { error } = await supabase.from("message_templates").upsert({
    user_id: userId,
    type: "whatsapp",
    body: values.body,
  }, { onConflict: 'user_id,type' });

  if (error) {
    throw new Error(error.message);
  }
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
    values: {
        body: template?.body || "",
    }
  });

  const mutation = useMutation({
    mutationFn: upsertWhatsAppTemplate,
    onSuccess: () => {
      showSuccess("تم حفظ قالب واتساب بنجاح!");
      queryClient.invalidateQueries({ queryKey: ["whatsappTemplate"] });
    },
    onError: (error) => {
      showError(`حدث خطأ: ${error.message}`);
    },
  });

  const onSubmit = (values: WhatsAppFormValues) => {
    if (!session?.user) return;
    mutation.mutate({ userId: session.user.id, values });
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>قالب واتساب</CardTitle>
        <CardDescription>
          قم بإعداد المحتوى الافتراضي لرسائل واتساب.
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
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "جاري الحفظ..." : "حفظ القالب"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};