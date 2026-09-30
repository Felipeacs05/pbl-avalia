'use client';

import React from "react";
import Link from "next/link";
import { useCadastro } from "@/hooks/useCadastro";
import { Toast } from "@/components/ui/Toast";

export function FormularioCadastro() {
  const {
    nome, setNome,
    email, setEmail,
    senha, setSenha,
    confirmarSenha, setConfirmarSenha,
    imagem, toast, setToast, loading,
    handleImageChange, handleSubmit
  } = useCadastro();

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            placeholder="Ex: João da Silva"
            disabled={loading}
            // Adicionado 'placeholder-gray-400 text-gray-900' para corrigir o contraste
            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#757DC3] disabled:opacity-60 placeholder-gray-400 text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="seu@email.com"
            disabled={loading}
            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#757DC3] disabled:opacity-60 placeholder-gray-400 text-gray-900"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              placeholder="••••••••"
              disabled={loading}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#757DC3] disabled:opacity-60 placeholder-gray-400 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar</label>
            <input
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              required
              placeholder="••••••••"
              disabled={loading}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#757DC3] disabled:opacity-60 placeholder-gray-400 text-gray-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Foto de Perfil</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            required
            disabled={loading}
            // Alterado text-gray-500 para text-transparent para esconder o texto feio nativo. 
            // Adicionado file:text-[#182860] para garantir que o texto DENTRO do botão não fica transparente.
            className="w-full text-sm text-transparent
                       file:mr-4 file:py-2.5 file:px-4 
                       file:rounded-xl file:border-0 
                       file:text-sm file:font-semibold 
                       file:bg-[#CDD3EE] file:text-[#182860] 
                       hover:file:bg-[#b5beeb] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          />
          
          {/* Mensagem de sucesso minimalista (sem nome do ficheiro) */}
          {imagem && (
            <p className="text-[11px] text-green-600 mt-2 font-semibold ml-1">
              ✓ Imagem selecionada com sucesso
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#757DC3] hover:bg-[#636BAE] text-white py-3 rounded-xl font-semibold text-sm shadow-sm transition-colors flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed mt-4"
        >
          {loading ? "Criando conta..." : "Cadastrar"}
        </button>

        <div className="text-center pt-2">
          <p className="text-sm text-gray-600">
            Já tem uma conta?{" "}
            <Link href="/" className="font-semibold text-[#182860] hover:text-[#757DC3] hover:underline transition-colors">
              Faça login
            </Link>
          </p>
        </div>
      </form>
    </>
  );
}