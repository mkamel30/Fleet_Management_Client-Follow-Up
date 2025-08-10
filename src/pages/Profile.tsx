import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { showSuccess, showError } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const profileSchema = z.object({
  full_name: z.string().min(1, "الاسم الكامل مطلوب"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface Profile {
  id: string;
  full_name: string | null;
  updated_at: string;
}

const fetchProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116: no rows found
    throw new Error(error.message);
  }
  return data;
};

const updateProfile = async ({ userId, values }: { userId: string; values: ProfileFormValues }) => {
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: values.full_name, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }
};

const ProfilePage = () => {
  const { session } = useSession();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", session?.user?.id],
    queryFn: () => fetchProfile(session!.user!.id),
    enabled: !!session?.user?.id,
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        full_name: profile.full_name || "",
      });
    }
  }, [profile, form]);

  const mutation = useMutation({
    mutationFn: (values: ProfileFormValues) => updateProfile({ userId: session!.user!.id, values }),
    onSuccess: () => {
      showSuccess("تم تحديث الملف الشخصي بنجاح!");
      queryClient.invalidateQueries({ queryKey: ["profile", session?.user?.id] });
      queryClient.invalidateQueries({ queryKey: ["followUps"] });
    },
    onError: (error) => {
      showError(`حدث خطأ: ${error.message}`);
    },
  });

  const onSubmit = (values: ProfileFormValues) => {
    if (!session?.user) return;
    mutation.mutate(values);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex justify-center">
        <Skeleton className="h-64 w-full max-w-lg" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="container mx-auto p-4 md:p-8 flex flex-col items-center">
        <Card className="w-full max-w-lg">
            <CardHeader>
                <CardTitle>الملف الشخصي</CardTitle>
                <CardDescription>
                قم بتحديث اسمك الكامل هنا. سيظهر هذا الاسم في سجلات المتابعة.
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
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
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