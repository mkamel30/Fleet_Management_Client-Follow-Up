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
  call_summary: string | null;
  next_follow_up_date: string | null;
  user_full_name: string;
  notes: string | null;
  created_at: string;
}