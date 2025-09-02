import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSession } from "@/context/SessionContext";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess } from "@/utils/toast";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const profileSchema = z.object({
  full_name: z.string().min(1, "الاسم الكامل مطلوب"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const ProfilePage = () => {
  const { session } = useSession();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
    },
  });

  useEffect(() => {
    if (session?.user?.id) {
      const storedName = localStorage.getItem(`local_user_name_${session.user.id}`);
      form.reset({
        full_name: storedName || session.user.email || "",
      });
    }
  }, [session, form]);

  const onSubmit = (values: ProfileFormValues) => {
    if (!session?.user) return;
    setIsSaving(true);
    try {
      localStorage.setItem(`local_user_name_${session.user.id}`, values.full_name);
      showSuccess("تم حفظ الاسم بنجاح في هذا المتصفح!");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div dir="rtl" className="container mx-auto p-4 md:p-8 flex flex-col items-center">
        <Card className="w-full max-w-lg">
            <CardHeader>
                <CardTitle>الملف الشخصي المحلي</CardTitle>
                <CardDescription>
                قم بتحديث اسمك الكامل هنا. سيتم حفظ هذا الاسم في متصفحك الحالي فقط وسيظهر في سجلات المتابعة التي تنشئها من هذا الجهاز.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>الاسم الكامل</FormLabel>
                        <FormControl>
                            <Input placeholder="مثال: محمد أحمد" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <div className="flex justify-between items-center">
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
                        </Button>
                        <Button asChild variant="outline">
                            <Link to="/">
                                <ArrowRight className="ml-2 h-4 w-4" />
                                العودة للرئيسية
                            </Link>
                        </Button>
                    </div>
                </form>
                </Form>
            </CardContent>
        </Card>
    </div>
  );
};

export default ProfilePage;