'use client';

// src/components/features/auth/RegisterAuth.tsx

import React from "react";
import Link from "next/link";
import { Toast } from "@/components/ui/Toast";
import { useRegistration } from "@/hooks/useRegistration";

export function RegisterAuth() {
    const {
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    image,
    toast,
    setToast,
    loading,
    handleImageChange,
    handleSubmit,
    } = useRegistration();

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
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
            <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            placeholder="Ex: João da Silva"
            disabled={loading}
            className="w-full p-3 border black-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#757DC3] disabled:opacity-60 placeholder-gray-400 text-gray-900"
            />
        </div>

        <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="seu@email.com"
            disabled={loading}
            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#757DC3] disabled:opacity-60 placeholder-gray-400 text-gray-900"
            />
        </div>

        <div className="grid grid-cols-2 gap-3">
            <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                placeholder="••••••••"
                disabled={loading}
                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#757DC3] disabled:opacity-60 placeholder-gray-400 text-gray-900"
            />
            </div>
            <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">Confirmar</label>
            <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                placeholder="••••••••"
                disabled={loading}
                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#757DC3] disabled:opacity-60 placeholder-gray-400 text-gray-900"
            />
            </div>
        </div>

        <div>
            <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">Foto de Perfil</label>
            <input
            id="image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            required
            disabled={loading}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#CDD3EE] file:text-[#182860] hover:file:bg-[#b5beeb] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {image && (
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