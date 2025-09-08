import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/SessionContext";
import { PosClient } from "@/types/pos"; // Changed to PosClient
import { ClientNote } from "@/types/note"; // Reusing ClientNote type for simplicity
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { showError, showSuccess } from "@/utils/toast";

interface PosClientNotesDialogProps {
  posClient: PosClient; // Changed to PosClient
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fetchNotes = async (posClientId: string): Promise<ClientNote[]> => {
  const { data, error } = await supabase
    .from("client_notes") // Reusing client_notes table for POS client notes
    .select("*")
    .eq("client_id", posClientId) // Assuming client_id can be used for pos_client_id
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching POS client notes:", error);
    throw new Error(error.message);
  }
  return data || [];
};

export const PosClientNotesDialog = ({ posClient, open, onOpenChange }: PosClientNotesDialogProps) => {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState("");

  const { data: notes, isLoading } = useQuery({
    queryKey: ["posClientNotes", posClient.id],
    queryFn: () => fetchNotes(posClient.id),
    enabled: !!posClient.id && open, // Only fetch when dialog is open
  });

  const addNoteMutation = useMutation({
    mutationFn: async (noteText: string) => {
      if (!session?.user) throw new Error("User not authenticated");
      const { error } = await supabase.from("client_notes").insert({ // Reusing client_notes table
        client_id: posClient.id, // Using posClient.id as client_id
        user_id: session.user.id,
        note: noteText,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("تمت إضافة الملاحظة بنجاح.");
      queryClient.invalidateQueries({ queryKey: ["posClientNotes", posClient.id] });
      setNewNote("");
    },
    onError: (error: Error) => {
      showError(`فشل إضافة الملاحظة: ${error.message}`);
    },
  });

  const handleAddNote = () => {
    if (newNote.trim()) {
      addNoteMutation.mutate(newNote.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle>ملاحظات على عميل نقاط البيع: {posClient.client_name}</DialogTitle>
          <DialogDescription>
            أضف واعرض الملاحظات العامة المتعلقة بهذا العميل هنا.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-2">
          <Textarea
            placeholder="اكتب ملاحظتك الجديدة هنا..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={3}
          />
          <Button onClick={handleAddNote} disabled={addNoteMutation.isPending || !newNote.trim()}>
            {addNoteMutation.isPending ? "جاري الحفظ..." : "حفظ الملاحظة"}
          </Button>
        </div>
        <div className="mt-4 flex-1 overflow-y-auto pr-2 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : notes && notes.length > 0 ? (
            notes.map((note) => (
              <div key={note.id} className="border p-3 rounded-lg bg-muted/50">
                <p className="mb-2 whitespace-pre-wrap">{note.note}</p>
                <p className="text-xs text-gray-500 text-left">
                  {format(new Date(note.created_at), "d MMMM yyyy, h:mm a", { locale: arSA })}
                </p>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-8">لا توجد ملاحظات لهذا العميل بعد.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};