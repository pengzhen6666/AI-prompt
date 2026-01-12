export interface RegisterType {
  email: string;
  password: string;
  username?: string;
  invitation_code?: string;
}
export interface LoginType {
  email: string;
  password: string;
}

export interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  status: "active" | "inactive" | "banned";
  role: "admin" | "user" | "guest";
  created_at: string;
  updated_at: string;
  email: string | null;
  active_template_id: string | null;
  balance: number;
  membership_code: string;
  membership_level?: {
    name: string;
    description: string;
    code: string;
  };
}
