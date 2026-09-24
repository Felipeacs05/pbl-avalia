import React from "react";

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export function PrimaryButton({ children, icon, ...props }: PrimaryButtonProps) {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      className="w-full bg-[#757DC3] hover:bg-[#636BAE] text-white py-3 rounded-xl font-semibold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
    >
      {icon && <span className="text-lg font-bold">{icon}</span>}
      {children}
    </button>
  );
}