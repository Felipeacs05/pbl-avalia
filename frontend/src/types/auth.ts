export interface AuthResponse {
  token: string;
  expiresAt?: number;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}