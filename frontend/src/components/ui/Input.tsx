// src/components/ui/Input.tsx
import React from "react";

// Herdamos todas as propriedades padrão de um input HTML (type, placeholder, onChange, etc)
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input(props: InputProps) {
    return (
    <input
        {...props}
        className={`w-full px-4 py-3 rounded-xl border border-gray-200 bg-white placeholder-gray-400 text-black text-sm focus:outline-none focus:ring-2 focus:ring-[#757DC3] transition-all ${props.className || ""}`}
    />
    );
}