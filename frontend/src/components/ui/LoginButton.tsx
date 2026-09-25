'use client';

import React from "react";

interface LoginButtonProps{
    texto: string;
    onClick?: () => void;
    type?: 'button' | 'submit';
    disabled?: boolean;
}

export function LoginButton({texto, onClick, type = 'submit', disabled}:LoginButtonProps){
    return(
        <button
        type={type}
        onClick={onClick}
        disabled = {disabled}
        className="w-full bg-[#757DC3] hover:bg-[#636BAE] text-white py-3 rounded-xl font-semibold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
        >
            {texto}
        </button>
    )
}

