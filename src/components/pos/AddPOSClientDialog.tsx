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
import { PosClient } from "@/types/pos"; // Import PosClient

const posClientSchema = z.object({
  client_code: z.string().min(1, { message: "الكود مطلوب" }),
  client_name: z.string().min(1, { message: "اسم العميل مطلوب" }),
  department: z.string().optional(),
});

type POSClientFormValues = z.infer<typeof posClientSchema>;

export const AddPOSClientDialog = () => {
  const [open, setOpen] = useState(false);
  const { session } = useSession();
  const queryClient = useQueryClient();

  const form = useForm<POSClientFormValues>({
    resolver: zodResolver(posClientSchema),
    defaultValues: {
      client_code: "",
      client_name: "",
      department: "",
    },
  });

  const onSubmit = async (values: POSClientFormValues) => {
    if (!session?.user) {
      showError("يجب عليك تسجيل الدخول أولاً");
      return;
    }

    const { error } = await supabase.from("pos_clients").insert([
      {
        ...values,
        user_id: session.user.id,
      } as Omit<PosClient, 'id' | 'created_at' | 'updated_at'>, // Cast to Omit<PosClient, ...>
    ]);

    if (error) {
      showError("حدث خطأ أثناء إضافة العميل: " + error.message);
    } else {
      showSuccess("تمت إضافة العميل بنجاح!");
      queryClient.invalidateQueries({ queryKey: ["posClients"] });
      form.reset();
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <span>
            <PlusCircle className="ml-2 h-4 w-4" />
            إضافة عميل جديد
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>إضافة عميل نقاط بيع جديد</DialogTitle>
          <DialogDescription>
            أدخل تفاصيل العميل الجديد هنا. انقر على "حفظ" عند الانتهاء.
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
                    <Input placeholder="مثال: POS001" {...field} />
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
                    <Input placeholder="اسم العميل" {...field} />
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