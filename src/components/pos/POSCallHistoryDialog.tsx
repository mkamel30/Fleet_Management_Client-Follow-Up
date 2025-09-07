import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { POSClient } from "@/types/pos";
import { POSCallLog } from "@/types/pos";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface POSCallHistoryDialogProps {
  client: POSClient;
  children: React.ReactNode;
}

const fetchPOSLogs = async (clientId: string): Promise<POSCallLog[]> => {
  const { data, error } = await supabase
    .from("pos_call_logs")
    .select("*")
    .eq("pos_client_id", clientId)
    .order("call_date", { ascending: false });

  if (error) {
    console.error("Error fetching call logs:", error);
    throw new Error(error.message);
  }
  return (data as POSCallLog[]) || [];
};

export const POSCallHistoryDialog = ({ client, children }: POSCallHistoryDialogProps) => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["posCallLogs", client.id],
    queryFn: () => fetchPOSLogs(client.id),
    enabled: !!client.id,
  });

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle>سجل المكالمات للعميل: {client.client_name}</DialogTitle>
          <DialogDescription>
            هنا يمكنك رؤية جميع المكالمات السابقة لهذا العميل.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex-1 overflow-y-auto pr-2">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="border p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-gray-500">
                      {format(new Date(log.call_date), "d MMMM yyyy, h:mm a", { locale: arSA })}
                    </p>
                    <Badge variant="outline">{log.user_full_name}</Badge>
                  </div>
                  <p className="mb-2 whitespace-pre-wrap">{log.notes}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text

Of course! This is an excellent feature request. We'll create a new "POS Payments" tab that mirrors the client management system but is tailored for tracking point-of-sale sales calls. This will involve creating new database tables, updating the UI, and adding the necessary functionality.

Here's the plan:

1.  **Database Setup**: I'll create new tables for `pos_clients` and `pos_call_logs` with proper Row Level Security (RLS) policies.
2.  **New Page**: I'll create a new `src/pages/POSPage.tsx` for the POS Payments management.
3.  **New Components**: I'll build the necessary components for managing POS clients, including:
    *   A table to display POS clients.
    *   Forms for adding and editing POS clients.
    *   A dialog for logging calls.
    *   A dialog for viewing call history.
    *   A form for uploading clients via Excel.
4.  **Navigation**: I'll add a new navigation link in the main header.
5.  **Reports**: I'll create a dedicated reports page for POS data.

Let's start by setting up the database schema.

<dyad-execute-sql description="Create POS clients table with proper RLS security">
-- Create POS clients table
CREATE TABLE public.pos_clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_code TEXT NOT NULL UNIQUE,
  client_name TEXT NOT NULL,
  department TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.pos_clients ENABLE ROW LEVEL SECURITY;

-- Create secure policies for each operation
CREATE POLICY "pos_clients_select_policy" ON public.pos_clients 
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "pos_clients_insert_policy" ON public.pos_clients 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pos_clients_update_policy" ON public.pos_clients 
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "pos_clients_delete_policy" ON public.pos_clients 
FOR DELETE TO authenticated USING (auth.uid() = user_id);
</dyad-execute-sql>

<dyad-execute-sql description="Create POS call logs table with proper RLS security">
-- Create POS call logs table
CREATE TABLE public.pos_call_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pos_client_id UUID REFERENCES public.pos_clients(id) ON DELETE CASCADE,
  call_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_full_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.pos_call_logs ENABLE ROW LEVEL SECURITY;

-- Create secure policies for each operation
CREATE POLICY "pos_call_logs_select_policy" ON public.pos_call_logs 
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "pos_call_logs_insert_policy" ON public.pos_call_logs 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pos_call_logs_update_policy" ON public.pos_call_logs 
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "pos_call_logs_delete_policy" ON public.pos_call_logs 
FOR DELETE TO authenticated USING (auth.uid() = user_id);
</dyad-execute-sql>

Now, let's create the TypeScript types for our new data structures.

<dyad-write path="src/types/pos.ts" description="Create TypeScript interfaces for POS clients and call logs">
export interface POSClient {
  id: string;
  user_id: string;
  client_code: string;
  client_name: string;
  department: string | null;
  created_at: string;
}

export interface POSCallLog {
  id: string;
  user_id: string;
  pos_client_id: string;
  call_date: string;
  user_full_name: string;
  notes: string | null;
  created_at: string;
}