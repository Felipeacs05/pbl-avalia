import React from "react";
import { AuthCardLayout } from "@/components/features/auth/AuthCardLayout";
import { RegisterAuth } from "@/components/features/auth/RegisterAuth";

// src/app/register/page.tsx

export default function RegisterPage() {
  return (
    <AuthCardLayout title="Criar Nova Conta">
      {/* O componente isolado que contém a UI, os estados e a comunicação com a API */}
      <RegisterAuth />
    </AuthCardLayout>
  );
}

