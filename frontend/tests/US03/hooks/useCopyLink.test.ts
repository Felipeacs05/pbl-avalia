import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCopyLink } from "@/hooks/useCopyLink";
import { COPY_ERROR_TEXT, LINK_COPIED_TEXT } from "../fixtures";

describe("[US03] useCopyLink", () => {
  const originalLocation = window.location;
  let writeTextMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock do origin
    delete (window as unknown as { location: unknown }).location;
    window.location = {
      origin: "http://localhost:3000",
    } as unknown as Location;

    // Mock do clipboard
    writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it("Deve iniciar com toast nulo", () => {
    const { result } = renderHook(() => useCopyLink());

    expect(result.current.toast).toBeNull();
  });

  it("Deve copiar a URL completa sem barras duplicadas e exibir toast de sucesso", async () => {
    const { result } = renderHook(() => useCopyLink());

    // Path sem barra inicial
    await act(async () => {
      await result.current.copyLink("app/join/CODE12");
    });

    expect(writeTextMock).toHaveBeenCalledWith("http://localhost:3000/app/join/CODE12");
    expect(result.current.toast).toEqual({
      type: "success",
      message: LINK_COPIED_TEXT,
    });

    // Path com barra inicial (não pode gerar //app/join)
    await act(async () => {
      await result.current.copyLink("/app/join/CODE12");
    });

    expect(writeTextMock).toHaveBeenCalledWith("http://localhost:3000/app/join/CODE12");
  });

  it("Deve exibir toast de erro quando a operação do clipboard for recusada ou falhar", async () => {
    writeTextMock.mockRejectedValue(new Error("Permissão de clipboard negada"));

    const { result } = renderHook(() => useCopyLink());

    await act(async () => {
      await result.current.copyLink("app/join/CODE12");
    });

    expect(result.current.toast).toEqual({
      type: "error",
      message: COPY_ERROR_TEXT,
    });
  });

  it("Deve limpar o toast ao chamar clearToast()", async () => {
    const { result } = renderHook(() => useCopyLink());

    await act(async () => {
      await result.current.copyLink("app/join/CODE12");
    });
    expect(result.current.toast).not.toBeNull();

    act(() => {
      result.current.clearToast();
    });

    expect(result.current.toast).toBeNull();
  });
});
