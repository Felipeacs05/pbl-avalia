export interface AuthResponse {
  token: string;
  user?: {
    id: string;
    nome: string;
    email: string;
  };
}