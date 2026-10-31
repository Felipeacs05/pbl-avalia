// src/services/apiMode.ts
export const IS_TEST = process.env.NODE_ENV === "test";

// Forçando a chamada real para testes de integração
export const USE_REAL_API = true;

if (typeof window !== "undefined") {
    console.log(
        `🌐 [API Mode] Status: ${USE_REAL_API ? "⚡ CONECTADO AO BACKEND REAL" : "🎭 MOCK ATIVO (Simulando)"
        }`
    );
}