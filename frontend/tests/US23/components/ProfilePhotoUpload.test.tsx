import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfilePhotoUpload } from "@/components/features/profile/ProfilePhotoUpload";
import {
  exactLimitPhoto,
  gifFile,
  oversizedPhoto,
  pdfFile,
  PHOTO_INVALID_TYPE_MESSAGE,
  PHOTO_TOO_LARGE_MESSAGE,
  STORED_USER,
  stubObjectUrls,
  validPhoto,
} from "../fixtures";

// Camada de UI (apresentação): componente de upload com preview instantâneo e loading visual.
// Sem hook nem service: devolve o arquivo escolhido pelo callback onChange.

type UploadProps = { photoUrl?: string | null; isUploading?: boolean };

let urls: ReturnType<typeof stubObjectUrls>;

function renderUpload({ photoUrl = STORED_USER.profilePictureUrl, isUploading = false }: UploadProps = {}) {
  const onChange = vi.fn<(file: File | null) => void>();
  // applyAccept: false -> o usuário pode escolher "Todos os arquivos" no seletor; a validação não pode depender do accept
  const user = userEvent.setup({ applyAccept: false });
  render(<ProfilePhotoUpload name={STORED_USER.name} photoUrl={photoUrl} isUploading={isUploading} onChange={onChange} />);
  return { user, onChange, input: () => screen.getByLabelText(/foto de perfil/i) as HTMLInputElement };
}

const previewImage = () => screen.getByRole("img", { name: /foto de perfil/i });

describe("[US23] ProfilePhotoUpload", () => {
  beforeEach(() => {
    urls = stubObjectUrls();
  });

  afterEach(() => {
    urls.restore();
  });

  it("Deve oferecer um campo de arquivo restrito a JPG e PNG", () => {
    const { input } = renderUpload();

    expect(input()).toHaveAttribute("type", "file");
    const accept = input().getAttribute("accept") ?? "";
    expect(accept).toMatch(/image\/jpeg|\.jpe?g/);
    expect(accept).toMatch(/image\/png|\.png/);
    expect(accept).not.toMatch(/image\/\*|gif|pdf/);
  });

  it("Deve mostrar a foto atual do usuário antes de qualquer seleção", () => {
    renderUpload();

    expect(previewImage().getAttribute("src")).toContain(STORED_USER.profilePictureUrl);
  });

  // --- PREVIEW INSTANTÂNEO ---

  it("Deve mostrar o preview da foto escolhida na hora, sem esperar o envio, e devolvê-la pelo onChange", async () => {
    const { user, onChange, input } = renderUpload();
    const photo = validPhoto();

    await user.upload(input(), photo);

    expect(urls.create).toHaveBeenCalledWith(photo);
    expect(previewImage()).toHaveAttribute("src", "blob:preview-1");
    expect(onChange).toHaveBeenLastCalledWith(photo);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("Fronteira: deve aceitar e mostrar o preview da foto com exatamente 5MB", async () => {
    const { user, onChange, input } = renderUpload();
    const photo = exactLimitPhoto();

    await user.upload(input(), photo);

    expect(onChange).toHaveBeenLastCalledWith(photo);
    expect(previewImage()).toHaveAttribute("src", "blob:preview-1");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("Deve liberar a URL do preview anterior ao trocar de foto", async () => {
    const { user, input } = renderUpload();

    await user.upload(input(), validPhoto());
    await user.upload(input(), validPhoto());

    expect(urls.revoke).toHaveBeenCalledWith("blob:preview-1");
    expect(previewImage()).toHaveAttribute("src", "blob:preview-2");
  });

  // --- PAYLOAD ACIMA DE 5MB E FORMATO ---

  it("Deve recusar foto acima de 5MB na hora: alerta, sem preview e sem entregar o arquivo", async () => {
    const { user, onChange, input } = renderUpload();
    const photo = oversizedPhoto();

    await user.upload(input(), photo);

    expect(screen.getByRole("alert")).toHaveTextContent(PHOTO_TOO_LARGE_MESSAGE);
    expect(onChange).not.toHaveBeenCalledWith(photo);
    expect(urls.create).not.toHaveBeenCalled();
    // Continua a foto atual
    expect(previewImage().getAttribute("src")).toContain(STORED_USER.profilePictureUrl);
  });

  it.each([
    ["PDF", pdfFile],
    ["GIF", gifFile],
  ])("Deve recusar arquivo %s com alerta pedindo JPG ou PNG", async (_case, build) => {
    const { user, onChange, input } = renderUpload();
    const file = build();

    await user.upload(input(), file);

    expect(screen.getByRole("alert")).toHaveTextContent(PHOTO_INVALID_TYPE_MESSAGE);
    expect(onChange).not.toHaveBeenCalledWith(file);
    expect(urls.create).not.toHaveBeenCalled();
  });

  it("Deve tirar o alerta quando o usuário escolhe uma foto válida depois de uma inválida", async () => {
    const { user, onChange, input } = renderUpload();
    const photo = validPhoto();

    await user.upload(input(), oversizedPhoto());
    expect(screen.getByRole("alert")).toBeInTheDocument();

    await user.upload(input(), photo);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith(photo);
  });

  it("Deve descartar a seleção válida anterior quando a nova escolha é inválida", async () => {
    const { user, onChange, input } = renderUpload();

    await user.upload(input(), validPhoto());
    await user.upload(input(), oversizedPhoto());

    // Sem isso, o formulário enviaria a foto anterior achando que é a recusada
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  // --- LOADING VISUAL ---

  it("Deve mostrar o loading visual e bloquear nova seleção enquanto a foto é enviada", () => {
    const { input } = renderUpload({ isUploading: true });

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(input()).toBeDisabled();
  });

  it("Não deve mostrar loading quando não há envio", () => {
    renderUpload();

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
