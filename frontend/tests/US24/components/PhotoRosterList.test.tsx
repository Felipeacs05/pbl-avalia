import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PhotoRosterList } from "@/components/PhotoRoster/PhotoRosterList";
import { usePhotoRoster } from "@/hooks/usePhotoRoster";
import {
  ACCESS_REVOKED_WARNING,
  ALICE,
  BRUNO,
  FORBIDDEN_MESSAGE,
  HISTORY_PRESERVED_WARNING,
  REMOVED_MESSAGE,
  removeButtonName,
  ROOM_ID,
  TUTOR,
} from "../fixtures";

// Camada de UI (container): confirmação e feedback da remoção. O hook é simulado.
vi.mock("@/hooks/usePhotoRoster", () => ({ usePhotoRoster: vi.fn() }));

type RosterState = ReturnType<typeof usePhotoRoster>;

function mockRoster(overrides: Partial<RosterState> = {}) {
  const state = {
    students: [TUTOR, ALICE, BRUNO],
    isLoading: false,
    error: null,
    refreshStudents: vi.fn(),
    removeStudent: vi.fn().mockResolvedValue(true),
    isRemoving: false,
    removeError: null,
    ...overrides,
  } as RosterState;
  vi.mocked(usePhotoRoster).mockReturnValue(state);
  return state;
}

function renderList(overrides: Partial<RosterState> = {}) {
  const state = mockRoster(overrides);
  const user = userEvent.setup();
  const view = render(<PhotoRosterList roomId={ROOM_ID} />);
  return { state, user, view };
}

async function openRemoval(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole("button", { name: removeButtonName(name) }));
  return within(screen.getByRole("dialog"));
}

describe("[US24] PhotoRosterList — remoção de aluno", () => {
  it("Deve carregar o carômetro da sala recebida", () => {
    renderList();

    expect(usePhotoRoster).toHaveBeenCalledWith(ROOM_ID);
  });

  it("Deve oferecer remoção para cada aluno, mas não para o tutor da sala", () => {
    renderList();

    expect(screen.getByRole("button", { name: removeButtonName(ALICE.name) })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: removeButtonName(BRUNO.name) })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: removeButtonName(TUTOR.name) })).not.toBeInTheDocument();
  });

  // --- CA1: AVISO ANTES DE QUALQUER DELETE ---

  it("CA1: deve abrir a confirmação com o nome do aluno e o aviso de histórico preservado e acesso revogado, sem remover ainda", async () => {
    const { state, user } = renderList();

    await openRemoval(user, ALICE.name);

    expect(screen.getByRole("dialog")).toHaveTextContent(ALICE.name);
    expect(screen.getByRole("dialog")).toHaveTextContent(HISTORY_PRESERVED_WARNING);
    expect(screen.getByRole("dialog")).toHaveTextContent(ACCESS_REVOKED_WARNING);
    expect(state.removeStudent).not.toHaveBeenCalled();
  });

  // --- CA3: CANCELAR ---

  it("CA3: cancelar fecha a confirmação, mantém o aluno e não chama a remoção", async () => {
    const { state, user } = renderList();

    const dialog = await openRemoval(user, ALICE.name);
    await user.click(dialog.getByRole("button", { name: /cancelar/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: removeButtonName(ALICE.name) })).toBeInTheDocument();
    expect(state.removeStudent).not.toHaveBeenCalled();
  });

  // --- CA2: CONFIRMAR ---

  it("CA2: confirmar remove o aluno escolhido, fecha a confirmação e mostra o feedback de sucesso", async () => {
    const { state, user } = renderList();

    const dialog = await openRemoval(user, ALICE.name);
    await user.click(dialog.getByRole("button", { name: /^remover$/i }));

    expect(state.removeStudent).toHaveBeenCalledTimes(1);
    expect(state.removeStudent).toHaveBeenCalledWith(ALICE.id);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await screen.findByText(REMOVED_MESSAGE)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(REMOVED_MESSAGE);
  });

  it("Deve remover o aluno certo quando há vários na sala", async () => {
    const { state, user } = renderList();

    const dialog = await openRemoval(user, BRUNO.name);
    await user.click(dialog.getByRole("button", { name: /^remover$/i }));

    expect(state.removeStudent).toHaveBeenCalledWith(BRUNO.id);
  });

  it("Deve desabilitar a confirmação enquanto a remoção está em andamento, para não enviar dois DELETE", async () => {
    const { user, view, state } = renderList();
    await openRemoval(user, ALICE.name);

    vi.mocked(usePhotoRoster).mockReturnValue({ ...state, isRemoving: true });
    view.rerender(<PhotoRosterList roomId={ROOM_ID} />);

    expect(within(screen.getByRole("dialog")).getByRole("button", { name: /^remover$/i })).toBeDisabled();
  });

  // --- FALHA (403) ---

  it("Não deve anunciar sucesso quando a remoção é recusada, e o aluno continua na lista", async () => {
    const { user } = renderList({ removeStudent: vi.fn().mockResolvedValue(false) });

    const dialog = await openRemoval(user, ALICE.name);
    await user.click(dialog.getByRole("button", { name: /^remover$/i }));

    expect(screen.queryByText(REMOVED_MESSAGE)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: removeButtonName(ALICE.name) })).toBeInTheDocument();
  });

  it("Deve mostrar em alerta a mensagem de recusa exposta pelo hook", () => {
    renderList({ removeError: "Apenas o tutor da sala pode remover alunos." });

    expect(screen.getByRole("alert")).toHaveTextContent(FORBIDDEN_MESSAGE);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("Não deve trocar o carômetro pelo painel de erro de carregamento quando só a remoção falhou", () => {
    renderList({ removeError: "Apenas o tutor da sala pode remover alunos." });

    expect(screen.queryByRole("button", { name: /tentar novamente/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: removeButtonName(ALICE.name) })).toBeInTheDocument();
  });
});
