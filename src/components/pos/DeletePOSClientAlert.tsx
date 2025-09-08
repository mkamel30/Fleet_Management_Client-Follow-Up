import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useQueryClient } from "@tanstack/react-query";
import React from "react"; // Import React for ReactNode

interface DeletePOSClientAlertProps {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete: () => void; // New prop for the actual delete logic
}

export function DeletePOSClientAlert({ clientId, open, onOpenChange, onConfirmDelete }: DeletePOSClientAlertProps) {
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    const { error } = await supabase.from("pos_clients").delete().eq("id", clientId);

    if (error) {
      showError("حدث خطأ أثناء حذف العميل: " + error.message);
    } else {
      showSuccess("تم حذف العميل بنجاح.");
      queryClient.invalidateQueries({ queryKey: ["posClients"] });
      onConfirmDelete(); // Call the passed callback
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
          <AlertDialogDescription>
            هذا الإجراء لا يمكن التراجع عنه. سيؤدي هذا إلى حذف العميل بشكل دائم
            من قاعدة البيانات.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
            نعم، قم بالحذف
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}