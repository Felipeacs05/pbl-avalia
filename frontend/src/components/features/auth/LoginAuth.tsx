'use client';

import React, { useState, SubmitEvent } from "react";
import { LoginButton } from "@/components/ui/LoginButton";
import { useRouter } from "next/navigation";
import Link from "next/link"; // 1. Importa o Link nativo do Next.js

export function LoginAuth() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const router = useRouter();

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    console.log("enviado");
    router.push('/professor-salas');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          E-mail
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="seu@email.com"
          className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#757DC3] transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Senha
        </label>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          placeholder="••••••••"
          className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#757DC3] transition-all"
        />
      </div>

      <LoginButton texto="Entrar" />

      {/* 2. Link posicionado logo abaixo do botão */}
      <div className="text-center pt-2">
        <p className="text-sm text-gray-600">
          Não tem uma conta?{" "}
          <Link 
            href="/cadastro" 
            className="font-semibold text-[#182860] hover:text-[#757DC3] hover:underline transition-colors"
          >
            Cadastre-se
          </Link>
        </p>
      </div>
    </form>
  );
}