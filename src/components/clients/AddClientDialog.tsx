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
import { useSession } from "@/context/SessionContext";
import { showSuccess, showError } from "@/utils/toast";
import { useQueryClient } from "@tanstack/react-query";
import { PlusCircle } from "lucide-react";

const clientSchema = z.object({
  company_name: z.string().min(1, { message: "اسم الشركة مطلوب" }),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email({ message: "بريد إلكتروني غير صالح" }).optional().or(z.literal("")),
  number_of_cars: z.coerce.number().int().positive({ message: "يجب أن يكون عدد السيارات رقمًا" }).optional(),
  fuel_type: z.enum(["بنزين", "سولار"]).optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export const AddClientDialog = () => {
  const [open, setOpen] = useState(false);
  const { session } = useSession();
  const queryClient = useQueryClient();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      company_name: "",
      contact_person: "",
      phone: "",
      email: "",
      number_of_cars: undefined,
      fuel_type: undefined,
    },
  });

  const onSubmit = async (values: ClientFormValues) => {
    if (!session?.user) {
      showError("يجب عليك تسجيل الدخول أولاً");
      return;
    }

    const { error } = await supabase.from("clients").insert([
      {
        ...values,
        user_id: session.user.id,
      },
    ]);

    if (error) {
      showError("حدث خطأ أثناء إضافة العميل: " + error.message);
    } else {
      showSuccess("تمت إضافة العميل بنجاح!");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      form.reset();
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="ml-2 h-4 w-4" />
          إضافة عميل جديد
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>إضافة عميل جديد</DialogTitle>
          <DialogDescription>
            أدخل تفاصيل العميل الجديد هنا. انقر على "حفظ" عند الانتهاء.
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
                    <Input placeholder="اسم الشركة" {...field} />
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
                    <Input placeholder="اسم الشخص المسؤول" {...field} />
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
                    <Input placeholder="05xxxxxxxx" {...field} />
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
                    <Input placeholder="email@example.com" {...field} />
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
                    <Input type="number" placeholder="10" {...field} />
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
                <Button type="submit">حفظ العميل</Button>
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