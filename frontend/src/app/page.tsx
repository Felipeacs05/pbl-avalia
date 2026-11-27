import { AuthCardLayout } from "@/components/features/auth/AuthCardLayout";
import { LoginAuth } from "@/components/features/auth/LoginAuth";

// src/app/page.tsx (AQUI É O LOGIN)

export default function LoginPage() {
  return (
    <AuthCardLayout title="Acessar Conta">
      <LoginAuth />
    </AuthCardLayout>
  );
}