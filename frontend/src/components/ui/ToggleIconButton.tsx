// src/components/ui/ToggleIconButton.tsx
import React from "react";

interface ToggleIconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> {
  icon: React.ReactNode;
  /** Nome acessível do botão; no desktop também aparece como texto ao lado do ícone. */
  label: string;
  pressed: boolean;
  /** "glass": sobre fundo colorido (translúcido). "solid": sobre fundo cinza (preto). */
  variant?: "glass" | "solid";
}

const VARIANT_CLASSES = {
  glass: {
    off: "bg-white/15 text-white hover:bg-white/25",
    on: "bg-white text-[#3B4C9B] shadow-sm",
  },
  solid: {
    off: "bg-black text-white hover:bg-neutral-800",
    on: "bg-[#4354A0] text-white ring-2 ring-white/70",
  },
} as const;

/**
 * Botão de alternância com área de toque de no mínimo 44x44px (min-h-11 / min-w-11).
 * No mobile mostra só o ícone; a partir de md exibe o rótulo para facilitar o uso com mouse.
 */
export function ToggleIconButton({
  icon,
  label,
  pressed,
  variant = "glass",
  ...props
}: ToggleIconButtonProps) {
  const tone = VARIANT_CLASSES[variant][pressed ? "on" : "off"];

  return (
    <button
      {...props}
      type={props.type ?? "button"}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className={`min-h-11 min-w-11 w-11 h-11 rounded-full inline-flex items-center justify-center transition-all active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${tone}`}
    >
      {icon}
    </button>
  );
}
