// src/hooks/useCopyLink.ts
import { useState } from "react";

type ToastState = { type: "success" | "error"; message: string } | null;

export function useCopyLink() {
    const [toast, setToast] = useState<ToastState>(null);

    const copyLink = async (path: string) => {
    try {
        const cleanPath = path.replace(/^\//, "");
        const fullUrl = `${window.location.origin}/${cleanPath}`;
        await navigator.clipboard.writeText(fullUrl);
        setToast({ type: "success", message: "Link copiado!" });
    } catch (error) {
        console.error(error);
        setToast({ type: "error", message: "Erro ao copiar o link" });
    }
    };

    const clearToast = () => setToast(null);

    return { copyLink, toast, clearToast };
}