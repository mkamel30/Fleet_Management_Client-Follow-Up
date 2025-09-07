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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/SessionContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { POSClient } from "@/types/pos";

I'll help you create a new POS Payments tab that replicates the fleet management system with the new fields and functionality you've requested. This will involve creating new database tables, components, pages, and updating the main navigation.

Here's the plan:

1.  **Create new database tables** for POS clients and call logs.
2.  **Create new components** for managing POS clients (add, edit, delete, call logs).
3.  **Create a new page** for the POS Payments section.
4.  **Update the main navigation** to include the new tab.
5.  **Create a new reports page** for POS data.

Let's start by creating the database tables:

<dyad-execute-sql description="Create POS clients table with proper RLS security">
-- Create POS clients table
CREATE TABLE public.pos_clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_code TEXT NOT NULL UNIQUE,
  client_name TEXT NOT NULL,
  department TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
  call_summary TEXT,
  next_follow_up_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_full_name TEXT
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

Now, let's create the TypeScript types for our new data:

<dyad-write path="src/types/pos.ts" description="Create TypeScript interfaces for POS clients and call logs">
export interface PosClient {
  id: string;
  user_id: string;
  client_code: string;
  client_name: string;
  department: string | null;
  created_at: string;
  updated_at: string;
}

export interface PosCallLog {
  id: string;
  user_id: string;
  pos_client_id: string;
  call_date: string;
  call_summary: string | null;
  next_follow_up_date: string | null;
  created_at: string;
  user_full_name: string | null;
}