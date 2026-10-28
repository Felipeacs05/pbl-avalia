import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registrationService } from "@/services/registrationService";
import { api } from "@/services/api";
import { makeImageFile, makeRegistrationData } from "../fixtures";

// Mock do cliente axios para testes unitários do serviço
vi.mock("@/services/api", () => ({
  api: {
    post: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

describe("[US01] registrationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Deve resolver a promessa após exatamente 2000 ms quando executado no caminho mock simulado (useMock = true)", async () => {
    vi.useFakeTimers();
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const data = makeRegistrationData({ email: "tutor.novo@uefs.br" });

    let resolved = false;
    const promise = registrationService.createAccount(data, true).then(() => {
      resolved = true;
    });

    // Antes de 2000 ms, a promessa deve permanecer pendente
    await vi.advanceTimersByTimeAsync(1999);
    expect(resolved).toBe(false);

    // Ao atingir 2000 ms, a promessa do setTimeout interno deve resolver com sucesso
    await vi.advanceTimersByTimeAsync(1);
    expect(resolved).toBe(true);
    await promise;

    // Garante que o log de simulação com o e-mail cadastrado foi disparado
    expect(consoleSpy).toHaveBeenCalledWith("Mock: Cadastro realizado com sucesso para:", data.email);
    consoleSpy.mockRestore();
  });

  it("Deve enviar requisição POST para /auth/register com FormData contendo name, email, password e sem a chave 'image' quando o usuário não selecionar foto (foto opcional)", async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { message: "Conta criada com sucesso" } });
    const data = makeRegistrationData({
      name: "João da Silva",
      email: "joao@uefs.br",
      password: "SenhaSegura@123",
      image: null,
    });

    await registrationService.createAccount(data, false);

    expect(mockedApi.post).toHaveBeenCalledTimes(1);
    const [url, formData, config] = mockedApi.post.mock.calls[0];

    expect(url).toBe("/auth/register");
    expect(config?.headers?.["Content-Type"]).toBe("multipart/form-data");

    // Valida o conteúdo montado no FormData
    const sentFormData = formData as FormData;
    expect(sentFormData.get("name")).toBe("João da Silva");
    expect(sentFormData.get("email")).toBe("joao@uefs.br");
    expect(sentFormData.get("password")).toBe("SenhaSegura@123");
    // A chave image não deve estar presente no FormData se data.image for nulo
    expect(sentFormData.get("image")).toBeNull();
  });

  it("Deve anexar o arquivo File original na chave 'image' do FormData quando a foto de perfil for selecionada", async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { message: "Conta criada com sucesso" } });
    const photo = makeImageFile(2048, "image/png", "foto-perfil.png");
    const data = makeRegistrationData({ image: photo });

    await registrationService.createAccount(data, false);

    expect(mockedApi.post).toHaveBeenCalledTimes(1);
    const [, formData] = mockedApi.post.mock.calls[0];
    const sentFormData = formData as FormData;

    // A imagem selecionada deve estar presente no FormData
    expect(sentFormData.get("image")).toBe(photo);
  });

  it("[QA] Deve propagar erro rejeitado pela chamada da API axios quando a rota falhar", async () => {
    const apiError = {
      response: {
        status: 409,
        data: { message: "E-mail já cadastrado no sistema." },
      },
    };
    mockedApi.post.mockRejectedValueOnce(apiError);

    await expect(registrationService.createAccount(makeRegistrationData(), false)).rejects.toEqual(apiError);
  });
});
