import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash2, PlusCircle, History, StickyNote } from "lucide-react";
import { PosClient } from "@/types/pos";
import { AddCallLogDialog } from "./AddCallLogDialog";
import { CallLogHistoryDialog } from "./CallLogHistoryDialog";
import { EditPOSClientDialog } from "./EditPOSClientDialog";
import { DeletePOSClientAlert } from "./DeletePOSClientAlert";
import { PosClientNotesDialog } from "./PosClientNotesDialog";

interface POSClientActionsProps {
  client: PosClient;
}

export const POSClientActions = ({ client }: POSClientActionsProps) => {
  const [isAddCallLogOpen, setIsAddCallLogOpen] = useState(false);
  const [isCallHistoryOpen, setIsCallHistoryOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAddCallLogOpen(true)}
        >
          <PlusCircle className="ml-2 h-4 w-4" />
          إضافة مكالمة
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">فتح القائمة</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>إجراءات أخرى</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => setIsCallHistoryOpen(true)}>
              <History className="ml-2 h-4 w-4" />
              <span>عرض السجل</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setIsNotesOpen(true)}>
              <StickyNote className="ml-2 h-4 w-4" />
              <span>الملاحظات</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setIsEditOpen(true)}>
              <Edit className="ml-2 h-4 w-4" />
              <span>تعديل</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setIsDeleteOpen(true)} className="text-red-600">
              <Trash2 className="ml-2 h-4 w-4" />
              <span>حذف</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AddCallLogDialog client={client} open={isAddCallLogOpen} onOpenChange={setIsAddCallLogOpen} />
      <CallLogHistoryDialog client={client} open={isCallHistoryOpen} onOpenChange={setIsCallHistoryOpen} />
      <PosClientNotesDialog client={client} open={isNotesOpen} onOpenChange={setIsNotesOpen} />
      <EditPOSClientDialog client={client} open={isEditOpen} onOpenChange={setIsEditOpen} />
      <DeletePOSClientAlert clientId={client.id} open={isDeleteOpen} onOpenChange={setIsDeleteOpen} />
    </>
  );
};