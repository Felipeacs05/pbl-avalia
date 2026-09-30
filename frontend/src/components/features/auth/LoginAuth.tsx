'use client';

import React, { useState, SubmitEvent } from "react";
import { LoginButton } from "@/components/ui/LoginButton";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

export function LoginAuth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Pega a função de login, o estado de carregando e o erro do Hook
  const { login, isLoading, error } = useAuth();

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault(); // Impede a tela de recarregar
    login({ email, password });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
      {/* Exibe a mensagem de erro vermelha se a senha estiver incorreta */}
      {error && (
        <div className="p-3 text-xs text-red-600 bg-red-100 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="seu@email.com"
          className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#757DC3]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
          className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#757DC3]"
        />
      </div>

      <LoginButton text={isLoading ? "Entrando..." : "Entrar"} type="submit" />

      <div className="text-center pt-2">
        <p className="text-sm text-gray-600">
          Não tem uma conta?{" "}
          <Link href="/register" className="font-semibold text-[#182860] hover:text-[#757DC3] hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </form>
  );
}