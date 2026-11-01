import { afterEach, describe, expect, it } from "vitest";
import { AxiosError, type AxiosAdapter } from "axios";
import { api } from "@/services/api";
import { API_429_MESSAGE, API_429_TEXT } from "../fixtures";

const originalAdapter = api.defaults.adapter;

// Adapter que recusa como o servidor faria: o interceptor de resposta é o que está em teste
function failWith(status: number, data: unknown) {
    api.defaults.adapter = ((config) =>
        Promise.reject(
            new AxiosError("falha simulada", "ERR_BAD_REQUEST", config, null, {
                status,
                statusText: "",
                headers: {},
                config,
                data,
            }),
        )) as AxiosAdapter;
}

afterEach(() => {
    api.defaults.adapter = originalAdapter;
});

describe("[US04] api (interceptor do 429)", () => {
    it("Deve trocar a mensagem do 429 pelo aviso de bloqueio temporário", async () => {
        failWith(429, {});

        await expect(api.post("/rooms/join", { code: "TEC499" })).rejects.toMatchObject({
            response: { status: 429, data: { message: expect.stringMatching(API_429_MESSAGE) } },
        });
    });

    it("Deve preservar os demais campos do corpo do 429", async () => {
        failWith(429, { retryAfter: 900 });

        await expect(api.post("/rooms/join", {})).rejects.toMatchObject({
            response: { data: { retryAfter: 900, message: API_429_TEXT } },
        });
    });

    it("Deve exibir o aviso mesmo quando o 429 chega com corpo em texto puro", async () => {
        // Proxies devolvem o 429 sem JSON; o texto não pode ser espalhado como objeto
        failWith(429, "Too Many Requests");

        await expect(api.post("/rooms/join", {})).rejects.toMatchObject({
            response: { data: { message: API_429_TEXT } },
        });
    });

    it("Deve não alterar a mensagem de outros erros", async () => {
        failWith(400, { message: "Código inválido" });

        await expect(api.post("/rooms/join", {})).rejects.toMatchObject({
            response: { status: 400, data: { message: "Código inválido" } },
        });
    });
});