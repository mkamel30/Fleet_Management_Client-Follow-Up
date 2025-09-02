export interface Client {
  id: string;
  user_id: string;
  company_name: string;
  phone: string | null;
  email: string | null;
  contact_person: string | null;
  number_of_cars: number | null;
  fuel_type: string | null;
  status: string | null;
  created_at: string;
  address: string | null;
}