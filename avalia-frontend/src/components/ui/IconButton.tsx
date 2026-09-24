import React from "react";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
}

export function IconButton({ icon, ...props }: IconButtonProps) {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
    >
      {icon}
    </button>
  );
}