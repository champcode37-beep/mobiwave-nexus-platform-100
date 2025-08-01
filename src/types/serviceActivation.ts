
export interface ServiceActivationRequest {
  id: string;
  user_id: string;
  service_id: string;
  status: string;
  business_justification: string;
  expected_usage: string;
  priority: string;
  created_at: string;
  processed_at: string | null;
  admin_notes: string | null;
  requested_at: string;
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
  user?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  service?: {
    id: string;
    service_name: string;
    service_type: string;
  };
}

export interface UserServiceActivation {
  id: string;
  user_id: string;
  service_id: string;
  is_active: boolean;
  activated_at: string;
  activated_by?: string;
  service: {
    id: string;
    service_name: string;
    service_type: string;
  };
}
