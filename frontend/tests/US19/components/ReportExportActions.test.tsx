import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReportExportActions } from "@/components/features/reports/ReportExportActions";
import { GENERATING_MESSAGE, IN_PROGRESS_MESSAGE } from "../fixtures";

function renderActions({ isGenerating = false, error = null as string | null } = {}) {
  const onExport = vi.fn();
  render(<ReportExportActions onExport={onExport} isGenerating={isGenerating} error={error} />);
  return {
    user: userEvent.setup(),
    onExport,
    pdfButton: screen.getByRole("button", { name: /pdf/i }),
    spreadsheetButton: screen.getByRole("button", { name: /planilha/i }),
  };
}

describe("[US19] ReportExportActions", () => {
  it("Deve oferecer o download em PDF e em Planilha, pedindo o formato de cada botão", async () => {
    const { user, onExport, pdfButton, spreadsheetButton } = renderActions();

    await user.click(pdfButton);
    await user.click(spreadsheetButton);

    expect(onExport).toHaveBeenNthCalledWith(1, "PDF");
    expect(onExport).toHaveBeenNthCalledWith(2, "XLSX");
    expect(pdfButton).toBeEnabled();
    expect(spreadsheetButton).toBeEnabled();
    expect(screen.queryByText(GENERATING_MESSAGE)).not.toBeInTheDocument();
  });

  it("[QA] Deve exibir o aviso de geração e bloquear os dois botões contra novos cliques enquanto gera", () => {
    const { onExport, pdfButton, spreadsheetButton } = renderActions({ isGenerating: true });

    expect(screen.getByRole("status")).toHaveTextContent(GENERATING_MESSAGE);
    expect(pdfButton).toBeDisabled();
    expect(spreadsheetButton).toBeDisabled();

    // fireEvent dispara o clique mesmo em botão desabilitado: comprova que nada é pedido
    for (let i = 0; i < 5; i++) {
      fireEvent.click(pdfButton);
      fireEvent.click(spreadsheetButton);
    }
    expect(onExport).not.toHaveBeenCalled();
  });

  it("Deve exibir em role=\"alert\" a recusa do backend", () => {
    renderActions({ error: IN_PROGRESS_MESSAGE });

    expect(screen.getByRole("alert")).toHaveTextContent(IN_PROGRESS_MESSAGE);
  });
});
