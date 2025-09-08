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
import { Label } from "@/components/ui/label";
import { useSession } from "@/context/SessionContext";
import { useQueryClient } from "@tanstack/react-query";
import { showError, showSuccess } from "@/utils/toast";
import * as XLSX from 'xlsx';
import { supabase } from "@/integrations/supabase/client";
import { PosClient } from "@/types/pos";

interface POSUploadDialogProps {
  children: React.ReactNode;
}

export const POSUploadDialog = ({ children }: POSUploadDialogProps) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { session } = useSession();
  const queryClient = useQueryClient();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    } else {
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      showError("الرجاء تحديد ملف Excel للرفع.");
      return;
    }
    if (!session?.user?.id) {
      showError("يجب عليك تسجيل الدخول أولاً.");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        const clientsToInsert: Omit<PosClient, 'id' | 'created_at' | 'updated_at'>[] = json.map((row: any) => ({
          user_id: session.user!.id,
          client_code: String(row['كود العميل'] || '').trim(),
          client_name: String(row['اسم العميل'] || '').trim(),
          department: String(row['القسم'] || '').trim() || null,
        })).filter(client => client.client_code && client.client_name); // Ensure essential fields are present

        if (clientsToInsert.length === 0) {
          showError("لم يتم العثور على بيانات صالحة للعملاء في ملف Excel.");
          setIsUploading(false);
          return;
        }

        // Attempt to insert clients, handling duplicates
        const { data: insertedClients, error: insertError } = await (supabase
          .from('pos_clients')
          .insert(clientsToInsert) as any) // Type assertion to bypass incorrect type inference
          .onConflict('client_code')
          .ignore()
          .select('id, client_code');

        if (insertError) {
          throw new Error(insertError.message);
        }

        showSuccess(`تم رفع ${insertedClients?.length || 0} عميل بنجاح. تم تجاهل العملاء المكررين.`);
        queryClient.invalidateQueries({ queryKey: ["posClients"] });
        setOpen(false);
        setFile(null);
      } catch (error: any) {
        console.error("Error processing Excel file:", error);
        showError(`فشل رفع العملاء: ${error.message}`);
      } finally {
        setIsUploading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>رفع عملاء نقاط البيع من Excel</DialogTitle>
          <DialogDescription>
            قم برفع ملف Excel يحتوي على بيانات العملاء. يجب أن يتضمن الملف أعمدة باسم "كود العميل" و "اسم العميل" و "القسم".
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="excelFile" className="text-right">
              ملف Excel
            </Label>
            <Input
              id="excelFile"
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? "جاري الرفع..." : "رفع العملاء"}
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="secondary" disabled={isUploading}>إلغاء</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};