import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EnterRoomModal } from "@/components/features/rooms-student/EnterRoomModal";
import { LINK_CODE, USER_EMAIL, USER_NAME, VALID_CODE } from "../fixtures";

function renderModal(initialCode?: string) {
    const onClose = vi.fn();
    const onEnter = vi.fn<(code: string) => void>();
    const user = userEvent.setup();

    render(
        <EnterRoomModal
            name={USER_NAME}
            email={USER_EMAIL}
            initialCode={initialCode}
            onClose={onClose}
            onEnter={onEnter}
        />,
    );

    return {
        user,
        onClose,
        onEnter,
        // O campo não tem <label>: o placeholder é o único nome disponível
        codeInput: screen.getByPlaceholderText(/código da sala/i),
        enterButton: screen.getByRole("button", { name: /entrar em sala pbl/i }),
    };
}

describe("[US04] EnterRoomModal", () => {
    it("Deve exibir o nome e o e-mail de quem está entrando", () => {
        renderModal();

        expect(screen.getByRole("heading", { name: USER_NAME })).toBeInTheDocument();
        expect(screen.getByText(USER_EMAIL)).toBeInTheDocument();
    });

    it("Deve ser um diálogo modal", () => {
        renderModal();

        // aria-modal faz o leitor de tela ignorar o conteúdo atrás do modal
        expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    });

    it("Deve começar com o campo vazio quando não há código no link", () => {
        const { codeInput } = renderModal();

        expect(codeInput).toHaveValue("");
    });

    it("Deve vir preenchido com o código do link e continuar editável", async () => {
        const { user, codeInput } = renderModal(LINK_CODE);

        expect(codeInput).toHaveValue(LINK_CODE);

        // O aluno ainda pode corrigir um link com código errado
        await user.clear(codeInput);
        await user.type(codeInput, VALID_CODE);
        expect(codeInput).toHaveValue(VALID_CODE);
    });

    it("Deve enviar o código com trim e em maiúsculas", async () => {
        const { user, onEnter, codeInput, enterButton } = renderModal();

        // O backend compara em maiúsculas: o front normaliza antes de enviar
        await user.type(codeInput, "  tec499  ");
        await user.click(enterButton);

        expect(onEnter).toHaveBeenCalledTimes(1);
        expect(onEnter).toHaveBeenCalledWith("TEC499");
    });

    it("Deve enviar o código vindo do link sem o aluno digitar nada", async () => {
        const { user, onEnter, enterButton } = renderModal("tec499");

        await user.click(enterButton);

        expect(onEnter).toHaveBeenCalledWith("TEC499");
    });

    it("Deve não chamar onEnter com o campo vazio", async () => {
        const { user, onEnter, enterButton } = renderModal();

        await user.click(enterButton);

        expect(onEnter).not.toHaveBeenCalled();
    });

    it("[QA] Deve não chamar onEnter quando o campo tem apenas espaços", async () => {
        const { user, onEnter, codeInput, enterButton } = renderModal();

        // Espaços não são código: sem isto, o brute-force gastaria tentativas com lixo
        await user.type(codeInput, "     ");
        await user.click(enterButton);

        expect(onEnter).not.toHaveBeenCalled();
    });

    it("Deve fechar pelo botão Fechar sem tentar entrar", async () => {
        const { user, onClose, onEnter } = renderModal(VALID_CODE);

        await user.click(screen.getByRole("button", { name: "Fechar" }));

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onEnter).not.toHaveBeenCalled();
    });
});