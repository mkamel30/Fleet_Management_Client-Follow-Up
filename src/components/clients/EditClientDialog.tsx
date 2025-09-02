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
import { Client } from "@/types/client";

const clientSchema = z.object({
  company_name: z.string().min(1, { message: "اسم الشركة مطلوب" }),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email({ message: "بريد إلكتروني غير صالح" }).optional().or(z.literal("")),
  address: z.string().optional(),
  number_of_cars: z.coerce.number().int().positive({ message: "يجب أن يكون عدد السيارات رقمًا" }).optional(),
  fuel_type: z.enum(["بنزين", "سولار"]).optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface EditClientDialogProps {
  client: Client;
  children: React.ReactNode;
}

export const EditClientDialog = ({ client, children }: EditClientDialogProps) => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      company_name: client.company_name,
      contact_person: client.contact_person || "",
      phone: client.phone || "",
      email: client.email || "",
      address: client.address || "",
      number_of_cars: client.number_of_cars || undefined,
      fuel_type: client.fuel_type as "بنزين" | "سولار" | undefined,
    },
  });

  const onSubmit = async (values: ClientFormValues) => {
    const { error } = await supabase
      .from("clients")
      .update(values)
      .eq("id", client.id);

    if (error) {
      showError("حدث خطأ أثناء تحديث العميل: " + error.message);
    } else {
      showSuccess("تم تحديث بيانات العميل بنجاح!");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>تعديل بيانات العميل</DialogTitle>
          <DialogDescription>
            قم بتحديث تفاصيل العميل هنا. انقر على "حفظ التغييرات" عند الانتهاء.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="company_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم الشركة</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contact_person"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الشخص المسؤول</FormLabel>
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
                  <FormLabel>رقم الهاتف</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>البريد الإلكتروني</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>العنوان</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="number_of_cars"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>عدد السيارات</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fuel_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع الوقود</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع الوقود" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="بنزين">بنزين</SelectItem>
                      <SelectItem value="سولار">سولار</SelectItem>
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