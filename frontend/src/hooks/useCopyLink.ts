// ====== ALTERADO POR CLAUDE ====== (arquivo novo)
"use client";

import { useState } from "react";

// Formato do toast que o hook expõe para o componente
interface ToastState {
  type: "success" | "error";
  message: string;
}

export function useCopyLink() {
  const [toast, setToast] = useState<ToastState | null>(null);

  // joinLink é o caminho relativo vindo do backend (ex: "app/join/A1B2C").
  // Juntamos com origin para montar a URL absoluta que o professor vai copiar.
  async function copyLink(joinLink: string): Promise<void> {
    const url = `${window.location.origin}/${joinLink}`;
    await navigator.clipboard.writeText(url);
    setToast({ type: "success", message: "Link copiado!" });
  }

  function clearToast() {
    setToast(null);
  }

  return { copyLink, toast, clearToast };
}
