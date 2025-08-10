export interface MessageTemplate {
  id: string;
  user_id: string;
  type: 'email' | 'whatsapp';
  subject: string | null;
  body: string | null;
  cc: string | null;
  created_at: string;
  updated_at: string;
}