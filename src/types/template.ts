export interface TemplateAttachment {
  id: string;
  template_id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  file_path: string;
  created_at: string;
}

export interface MessageTemplate {
  id: string;
  user_id: string;
  type: 'email' | 'whatsapp';
  subject: string | null;
  body: string | null;
  cc: string | null;
  created_at: string;
  updated_at: string;
  attachments: TemplateAttachment[];
}