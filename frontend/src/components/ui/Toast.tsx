// src/components/ui/Toast.tsx
import React, { useEffect } from "react";
import { AlertCircle, CheckCircle, X } from "lucide-react";

interface ToastProps {
  message: string;
  type?: "success" | "error";
  onClose: () => void;
}

export function Toast({ message, type = "error", onClose }: ToastProps) {
  // Fecha o popup automaticamente após 3 segundos
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isError = type === "error";

  return (
    // Animação feita com Tailwind: desliza de cima para baixo
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-[bounce_0.3s_ease-in-out]">
      <div className="bg-white px-5 py-3 rounded-xl shadow-xl border border-gray-100 flex items-center gap-3 min-w-[300px]">
        {isError ? (
          <AlertCircle className="text-red-500" size={20} />
        ) : (
          <CheckCircle className="text-green-500" size={20} />
        )}
        
        <p className="text-sm font-semibold text-gray-800 flex-1">{message}</p>
        
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}