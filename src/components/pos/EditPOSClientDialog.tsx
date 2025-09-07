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
import { Input } from "@/components/ui/input";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { useQueryClient } from "@tanstack/react-query";
import { POSClient } from "@/types/pos";

const posClientSchema = z.object({
  client_code: z.string().min(1, { message: "الكود مطلوب" }),
  client_name: z.string().min(1, { message: "اسم العميل مطلوب" }),
  department: z.string().optional(),
});

type POSClientFormValues = z.infer<typeof posClientSchema>;

interface EditPOSClientDialogProps {
  client: POSClient;
  children: React.ReactNode;
}

export const EditPOSClientDialog = ({ client, children }: EditPOSClientDialogProps) => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<POSClientFormValues>({
    resolver: zodResolver(posClientSchema),
    defaultValues: {
      client_code: client.client_code,
      client_name: client.client_name,
      department: client.department || "",
    },
  });

  const onSubmit = async (values: POSClientFormValues) => {
    const { error } = await supabase
      .from("pos_clients")
      .update(values)
      .eq("id", client.id);

    if (error) {
      showError("حدث خطأ أثناء تحديث العميل: " + error.message);
    } else {
      showSuccess("تم تحديث بيانات العميل بنجاح!");
      queryClient.invalidateQueries({ queryKey: ["posClients"] });
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>تعديل بيانات العميل</DialogTitle>
          <DialogDescription>
            قم بتحديث تفاصيل العميل هنا. انقر على "حفظ التغييرات" عند الانتهاء.
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
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>القسم</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر القسم" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="تجزئة">تجزئة</SelectItem>
                      <SelectItem value="خدمات">خدمات</SelectItem>
                      <SelectItem value="صناعة">صناعة</SelectItem>
                      <SelectItem value="حكومي">حكومي</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">حفظ التغييرات</Button>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  إلغاء
                </Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};