'use client';

import React from "react";

interface LoginButtonProps{
    text: string;
    onClick?: () => void;
    type?: 'button' | 'submit';
    disabled?: boolean;
}

export function LoginButton({text, onClick, type = 'submit', disabled}:LoginButtonProps){
    return(
        <button
        type={type}
        onClick={onClick}
        disabled = {disabled}
        className="w-full bg-[#757DC3] hover:bg-[#636BAE] text-white py-3 rounded-xl font-semibold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
        >
            {text}
        </button>
    )
}