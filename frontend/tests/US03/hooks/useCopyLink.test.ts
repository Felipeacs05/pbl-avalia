import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCopyLink } from "@/hooks/useCopyLink";

let writeText: Mock<(text: string) => Promise<void>>;

beforeEach(() => {
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
});

describe("[US03] useCopyLink", () => {
  it("[QA] should write the absolute join URL to the clipboard", async () => {
    const { result } = renderHook(() => useCopyLink());

    await act(async () => {
      await result.current.copyLink("app/join/A1B2C");
    });

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/app/join/A1B2C`);
  });

  it("[QA] should expose a success toast after the link is copied", async () => {
    const { result } = renderHook(() => useCopyLink());

    await act(async () => {
      await result.current.copyLink("app/join/A1B2C");
    });

    expect(result.current.toast).toEqual({
      type: "success",
      message: expect.stringMatching(/link copiado/i),
    });
  });
});
