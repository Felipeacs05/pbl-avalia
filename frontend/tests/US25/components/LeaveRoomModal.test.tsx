import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LeaveRoomModal } from "@/components/features/rooms-student/LeaveRoomModal";
import {
  ACCESS_LOST_WARNING,
  CANCEL_BUTTON,
  CONFIRM_BUTTON,
  DATA_KEPT_WARNING,
  ROOM,
  TUTOR_CANNOT_LEAVE_TEXT,
  TUTOR_NOTIFIED_WARNING,
} from "../fixtures";

// Camada de UI (apresentação): sem hook nem service. Recebe estado por props e devolve ações por callbacks.
type ModalProps = {
  isLeaving?: boolean;
  error?: string | null;
};

// O ConfirmModal do projeto usa role="alertdialog"; modais próprios usam role="dialog". Os dois servem.
function getDialog() {
  return screen.queryByRole("dialog") ?? screen.getByRole("alertdialog");
}

function queryDialog() {
  return screen.queryByRole("dialog") ?? screen.queryByRole("alertdialog");
}

function renderModal({ isLeaving = false, error = null }: ModalProps = {}) {
  const onConfirm = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  const onClose = vi.fn<() => void>();
  const user = userEvent.setup();

  render(
    <LeaveRoomModal roomName={ROOM.name} isLeaving={isLeaving} error={error} onConfirm={onConfirm} onClose={onClose} />,
  );

  const dialog = within(getDialog());
  return {
    user,
    onConfirm,
    onClose,
    confirmButton: dialog.getByRole("button", { name: CONFIRM_BUTTON }),
    cancelButton: dialog.getByRole("button", { name: CANCEL_BUTTON }),
  };
}

describe("[US25] LeaveRoomModal", () => {
  beforeEach(() => {
    // Componente de apresentação: nenhuma requisição pode sair dele
    vi.stubGlobal("fetch", vi.fn());
  });

  // --- AVISOS ANTES DA CONFIRMAÇÃO ---

  it("Deve exibir o nome da sala que o aluno vai deixar", () => {
    renderModal();

    expect(getDialog()).toHaveTextContent(ROOM.name);
  });

  it("Deve avisar que os dados do aluno (notas e histórico) serão mantidos", () => {
    renderModal();

    expect(getDialog()).toHaveTextContent(DATA_KEPT_WARNING);
  });

  it("Deve avisar que o aluno perderá o acesso à sala", () => {
    renderModal();

    expect(getDialog()).toHaveTextContent(ACCESS_LOST_WARNING);
  });

  it("Deve avisar que o tutor responsável será notificado", () => {
    renderModal();

    expect(getDialog()).toHaveTextContent(TUTOR_NOTIFIED_WARNING);
  });

  it("Não deve chamar a saída nem fazer requisições só por abrir o aviso", () => {
    const { onConfirm, onClose } = renderModal();

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  // --- CONFIRMAR ---

  it("Deve chamar onConfirm uma única vez ao confirmar, sem fechar por conta própria", async () => {
    const { user, onConfirm, onClose, confirmButton } = renderModal();

    await user.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("Deve desabilitar a confirmação durante o envio, impedindo um segundo pedido", async () => {
    const { user, onConfirm, confirmButton } = renderModal({ isLeaving: true });

    expect(confirmButton).toBeDisabled();
    await user.click(confirmButton);

    expect(onConfirm).not.toHaveBeenCalled();
  });

  // --- CANCELAR ---

  it("Deve chamar onClose ao cancelar, sem chamar a saída", async () => {
    const { user, onConfirm, onClose, cancelButton } = renderModal();

    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  // --- ERRO ---

  it("Deve exibir o erro recebido com role=alert e manter o modal aberto para nova tentativa", () => {
    const { confirmButton } = renderModal({ error: TUTOR_CANNOT_LEAVE_TEXT });

    const alert = within(getDialog()).getByRole("alert");
    expect(alert).toHaveTextContent(TUTOR_CANNOT_LEAVE_TEXT);
    expect(queryDialog()).toBeInTheDocument();
    expect(confirmButton).toBeEnabled();
  });

  it("Não deve exibir alerta quando não há erro", () => {
    renderModal();

    expect(within(getDialog()).queryByRole("alert")).not.toBeInTheDocument();
  });
});
