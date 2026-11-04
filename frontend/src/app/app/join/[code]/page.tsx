"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { roomService } from "../../../../services/roomService";

export default function JoinByLinkPage() {
  const params = useParams();
  const router = useRouter();
  const rawCode = params?.code ? String(params.code).trim().toUpperCase() : "";

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (!rawCode) return;

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      // Salva o código de acesso para entrar automaticamente após login
      if (typeof window !== "undefined") {
        localStorage.setItem("pendingJoinCode", rawCode);
      }
      router.push(`/?joinCode=${rawCode}`);
      return;
    }

    let isMounted = true;

    async function attemptJoin() {
      try {
        const joinedRoom = await roomService.joinRoom(rawCode);
        if (isMounted) {
          setStatus("success");
          setTimeout(() => {
            router.push(`/student-rooms/${joinedRoom.id}`);
          }, 800);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const errObj = err as { response?: { status?: number; data?: { message?: string } } };
        const status = errObj.response?.status;
        const msg = errObj.response?.data?.message || "";

        if (status === 400 && msg.includes("Tutor não pode")) {
          // O próprio tutor abriu o link: redireciona para a aba do professor
          router.push("/teacher-rooms");
          return;
        }

        setStatus("error");
        if (status === 429) {
          setErrorMessage("Muitas tentativas com códigos inválidos. Tente novamente em 15 minutos.");
        } else {
          setErrorMessage(`O código “${rawCode}” não corresponde a nenhuma sala ativa.`);
        }
      }
    }

    attemptJoin();

    return () => {
      isMounted = false;
    };
  }, [rawCode, router]);

  return (
    <div className="w-full min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-xl border border-gray-100 flex flex-col items-center text-center">
        {status === "loading" && (
          <>
            <div className="w-14 h-14 rounded-full bg-[#EAEFFD] text-[#182860] flex items-center justify-center mb-4 animate-pulse">
              <div className="w-6 h-6 border-3 border-[#182860] border-t-transparent rounded-full animate-spin" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Entrando na sala...</h2>
            <p className="text-xs text-gray-500">
              Validando o código <span className="font-semibold text-gray-800">“{rawCode}”</span> e vinculando sua conta.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 stroke-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Você entrou na sala!</h2>
            <p className="text-xs text-gray-500 mb-2">Redirecionando você para a sala de aula...</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 stroke-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Não foi possível entrar</h2>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">{errorMessage}</p>
            <button
              type="button"
              onClick={() => router.push("/student-rooms")}
              className="w-full py-3 text-xs font-semibold text-white bg-[#182860] hover:bg-[#121e48] rounded-xl transition-colors cursor-pointer"
            >
              Ir para Minhas Salas
            </button>
          </>
        )}
      </div>
    </div>
  );
}

