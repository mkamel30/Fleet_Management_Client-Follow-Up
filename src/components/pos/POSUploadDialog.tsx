import { useState, ChangeEvent, ReactNode } from "react";
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
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/SessionContext";
import { showLoading, dismissToast, showSuccess, showError } from "@/utils/toast";
import * as XLSX from 'xlsx';
import { PosClient } from "@/types/pos";

interface POSUploadDialogProps {
  children: ReactNode;
}

type ClientData = {
  'client_code': string;
  'client_name': string;
  'department'?: string;
};

export const POSUploadDialog = ({ children }: POSUploadDialogProps) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();
  const { session } = useSession();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !session?.user) return;

    setIsUploading(true);
    const toastId = showLoading("جاري قراءة الملف...");

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: ClientData[] = XLSX.utils.sheet_to_json(worksheet);

        dismissToast(toastId);
        const uploadToastId = showLoading(`جاري رفع ${json.length} عميل...`);

        const clientsToInsert = json.map(row => ({
          user_id: session.user.id,
          client_code: String(row.client_code),
          client_name: String(row.client_name),
          department: row.department ? String(row.department) : null,
        }));

        const { error } = await supabase.from('pos_clients').upsert(
          clientsToInsert as Omit<PosClient, 'id' | 'created_at' | 'updated_at'>[],
          { onConflict: 'client_code' }
        );

        dismissToast(uploadToastId);

        if (error) {
          throw new Error(error.message);
        }

        showSuccess(`تم رفع ومعالجة ${json.length} عميل بنجاح.`);
        queryClient.invalidateQueries({ queryKey: ["posClients"] });
        queryClient.invalidateQueries({ queryKey: ["posDepartments"] });
        setFile(null);
        setOpen(false);
      } catch (err: any) {
        dismissToast(toastId);
        showError(`فشل الرفع: ${err.message}`);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>رفع عملاء من ملف Excel</DialogTitle>
          <DialogDescription>
            اختر ملف Excel لرفع العملاء دفعة واحدة. يجب أن يحتوي الملف على أعمدة بالأسماء التالية: client_code, client_name, department (اختياري).
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
          <p className="text-xs text-muted-foreground mt-2">
            سيتم تحديث العملاء الحاليين إذا تم العثور على client_code مطابق.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? "جاري الرفع..." : "رفع الملف"}
          </Button>
          <DialogClose asChild>
            <Button variant="outline">إلغاء</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};