// src/app/cadastro/page.tsx
"use client";

import React from "react";
import { Upload, Loader2 } from "lucide-react";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Input } from "@/components/ui/Input";
import { useCadastro } from "@/hooks/useCadastro";
import { Toast } from "@/components/ui/Toast";

export default function CadastroPage() {
    const {
        nome, setNome, email, setEmail, senha, setSenha,
        confirmarSenha, setConfirmarSenha, imagem,
        toast, setToast, loading, handleImageChange, handleSubmit
    } = useCadastro();

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center px-6 pt-16 font-sans">
            
            <h1 className="text-2xl font-extrabold text-[#2C334A] mb-8">Avalia</h1>
            
            <div className="text-center mb-8">
                <h2 className="text-lg font-bold text-[#2C334A]">Criar Conta</h2>
                <p className="text-sm text-gray-500 mt-1">
                    Preencha suas informações<br />para a criação de sua conta
                </p>
            </div>

            <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
                <Input type="text" placeholder="Nome Completo" maxLength={100} value={nome} onChange={(e) => setNome(e.target.value)} />
                <Input type="email" placeholder="E-mail" maxLength={100} value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input type="password" placeholder="Senha" maxLength={50} value={senha} onChange={(e) => setSenha(e.target.value)} />
                <Input type="password" placeholder="Confirmar senha..." maxLength={50} value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} />

                <label className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 bg-white text-black text-sm cursor-pointer hover:bg-gray-50 transition-colors">
                    <span className={imagem ? "text-gray-800 truncate" : "text-gray-400"}>
                        {imagem ? imagem.name : "Upload de imagem (até 5 MB)"}
                    </span>
                    <Upload size={20} className="text-[#757DC3] flex-shrink-0 ml-2" />
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>

                {toast && (
                    <Toast 
                        message={toast.message} 
                        type={toast.type} 
                        onClose={() => setToast(null)} 
                    />
                )}

                <div className="pt-2">
                    <PrimaryButton type="submit" disabled={loading} icon={loading ? <Loader2 size={18} className="animate-spin" /> : null}>
                        {loading ? "Criando Conta..." : "Criar Conta"}
                    </PrimaryButton>
                </div>
            </form>

            <p className="mt-6 text-xs text-gray-400">
                Já tem conta? <a href="/login" className="text-[#6EA8A3] font-bold hover:underline">Login</a>
            </p>
        </div>
    );
}