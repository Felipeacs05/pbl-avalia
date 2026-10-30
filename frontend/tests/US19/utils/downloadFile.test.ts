import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadFile } from "@/utils/downloadFile";
import { FINAL_XLSX_NAME, makeExportedFile, XLSX_TYPE } from "../fixtures";

const BLOB_URL = "blob:http://localhost/relatorio";

// O jsdom não implementa createObjectURL/revokeObjectURL: os testes os definem
const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => BLOB_URL);
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
});

describe("[US19] downloadFile", () => {
  it("Deve salvar o arquivo no computador com o nome recebido e liberar a URL temporária", () => {
    const file = makeExportedFile({
      fileName: FINAL_XLSX_NAME,
      blob: new Blob(["PK-planilha"], { type: XLSX_TYPE }),
    });
    // O jsdom não navega: o clique é capturado para conferir o link que o navegador baixaria
    const clicked: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this);
    });

    downloadFile(file);

    expect(URL.createObjectURL).toHaveBeenCalledWith(file.blob);
    expect(clicked).toHaveLength(1);
    expect(clicked[0].href).toBe(BLOB_URL);
    expect(clicked[0].download).toBe(FINAL_XLSX_NAME);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(BLOB_URL);
    // O link é temporário: não fica na página depois do download
    expect(document.querySelector("a[download]")).toBeNull();
  });
});
