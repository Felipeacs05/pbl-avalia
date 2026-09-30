import React from "react";
import { RegisterAuth } from "@/components/features/auth/RegisterAuth"; 

// src/app/register/page.tsx

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg flex flex-col items-center w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Criar Nova Conta</h1>
        
        {/* O componente isolado que contém a UI, os estados e a comunicação com a API */}
        <RegisterAuth />
      </div>
    </main>
  );
}