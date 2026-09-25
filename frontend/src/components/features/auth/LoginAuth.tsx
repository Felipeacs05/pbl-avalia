'use client';

import React, {useState, SubmitEvent} from "react";
import { LoginButton } from "@/components/ui/LoginButton";
import { useRouter } from "next/navigation";

export function LoginAuth() {

    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');

    const router = useRouter();

    function handleSubmit (e: SubmitEvent){
        e.preventDefault();
        console.log("enviado") // trocar pelo envio de dados para a api
        router.push('/professor-salas')
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
    </form>
  );
}


