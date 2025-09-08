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
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { useQueryClient } from "@tanstack/react-query";
import { PosClient } from "@/types/pos";
import { useEffect } from "react";

const posClientSchema = z.object({
  client_code: z.string().min(1, { message: "الكود مطلوب" }),
  client_name: z.string().min(1, { message: "اسم العميل مطلوب" }),
  supply_management: z.string().optional(),
  phone: z.string().optional(),
});

type POSClientFormValues = z.infer<typeof posClientSchema>;

interface EditPOSClientDialogProps {
  client: PosClient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditPOSClientDialog = ({ client, open, onOpenChange }: EditPOSClientDialogProps) => {
  const queryClient = useQueryClient();

  const form = useForm<POSClientFormValues>({
    resolver: zodResolver(posClientSchema),
  });

  useEffect(() => {
    if (client) {
      form.reset({
        client_code: client.client_code,
        client_name: client.client_name,
        supply_management: client.supply_management || "",
        phone: client.phone || "",
      });
    }
  }, [client, form]);

  const onSubmit = async (values: POSClientFormValues) => {
    const { error } = await supabase
      .from("pos_clients")
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq("id", client.id);

    if (error) {
      showError("حدث خطأ أثناء تحديث العميل: " + error.message);
    } else {
      showSuccess("تم تحديث بيانات العميل بنجاح!");
      queryClient.invalidateQueries({ queryKey: ["posClients"] });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>تعديل بيانات العميل</DialogTitle>
          <DialogDescription>
            قم بتحديث تفاصيل العميل هنا.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="client_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>كود العميل</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="client_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم العميل</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="supply_management"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الإدارة التموينية</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم التليفون</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">حفظ التغييرات</Button>
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