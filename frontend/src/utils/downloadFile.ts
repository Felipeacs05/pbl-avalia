// src/utils/downloadFile.ts

import type { ExportedFile } from "../types/reportExport";

/**
 * Dispara o download nativo de um arquivo Blob no navegador e libera
 * o ObjectURL da memória imediatamente após o clique.
 */
export function downloadFile(file: ExportedFile): void {
  const objectUrl = URL.createObjectURL(file.blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = file.fileName;
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    if (anchor.parentNode) {
      anchor.parentNode.removeChild(anchor);
    }
    URL.revokeObjectURL(objectUrl);
  }
}
