import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useGradeAdjustment } from "@/hooks/useGradeAdjustment";
import { gradeAdjustmentService } from "@/services/gradeAdjustmentService";
import {
  ADJUSTED_GRADE,
  ASSESSMENT_ID,
  FORBIDDEN_MESSAGE,
  JUSTIFICATION,
  makeForbiddenError,
  makeGradeAdjustment,
} from "../fixtures";

vi.mock("@/services/gradeAdjustmentService", () => ({
  gradeAdjustmentService: { adjustGrade: vi.fn() },
}));

const service = vi.mocked(gradeAdjustmentService);

const INPUT = { adjustedGrade: ADJUSTED_GRADE, justification: JUSTIFICATION };

describe("[US15] useGradeAdjustment", () => {
  it("Deve iniciar sem ajuste, sem erro e sem chamar o service", () => {
    const { result } = renderHook(() => useGradeAdjustment());

    expect(result.current.lastAdjustment).toBeNull();
    expect(result.current.error).toBeNull();
    expect(service.adjustGrade).not.toHaveBeenCalled();
  });

  it("Deve encaminhar a avaliação, a nota e a justificativa ao service e guardar o ajuste devolvido", async () => {
    service.adjustGrade.mockResolvedValue(makeGradeAdjustment());
    const { result } = renderHook(() => useGradeAdjustment());

    await act(async () => {
      await result.current.adjustGrade(ASSESSMENT_ID, INPUT);
    });

    expect(service.adjustGrade).toHaveBeenCalledTimes(1);
    expect(service.adjustGrade).toHaveBeenCalledWith(ASSESSMENT_ID, INPUT);
    // O ajuste guardado é o do servidor: traz a nota original preservada e a flag de modificação
    expect(result.current.lastAdjustment).toEqual(makeGradeAdjustment());
    expect(result.current.error).toBeNull();
  });

  it("Deve expor a mensagem e não guardar ajuste quando o ajuste é recusado com 403", async () => {
    service.adjustGrade.mockRejectedValue(makeForbiddenError());
    const { result } = renderHook(() => useGradeAdjustment());

    // A rejeição é capturada pelo hook: a tela recebe o erro, não uma exceção
    await act(async () => {
      await result.current.adjustGrade(ASSESSMENT_ID, INPUT);
    });

    expect(result.current.error).toMatch(FORBIDDEN_MESSAGE);
    expect(result.current.lastAdjustment).toBeNull();
  });

  it("Deve limpar o erro quando o ajuste seguinte é salvo", async () => {
    service.adjustGrade
      .mockRejectedValueOnce(makeForbiddenError())
      .mockResolvedValueOnce(makeGradeAdjustment());
    const { result } = renderHook(() => useGradeAdjustment());

    await act(async () => {
      await result.current.adjustGrade(ASSESSMENT_ID, INPUT);
    });
    expect(result.current.error).toMatch(FORBIDDEN_MESSAGE);

    await act(async () => {
      await result.current.adjustGrade(ASSESSMENT_ID, INPUT);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.lastAdjustment).toEqual(makeGradeAdjustment());
  });
});
