export interface FollowUp {
  id: string;
  client_id: string;
  user_id: string;
  feedback: string | null;
  status: string;
  next_follow_up_date: string | null;
  created_at: string;
  user?: { full_name: string | null };
}