export interface PosClient {
  id: string;
  user_id: string;
  client_code: string;
  client_name: string;
  supply_management: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface PosCallLog {
  id: string;
  pos_client_id: string;
  user_id: string;
  user_full_name: string | null;
  feedback: string;
  status: string;
  next_follow_up_date: string | null;
  created_at: string;
}