import { describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateProblemModal } from "@/components/features/disciplines/CreateProblemModal";
import {
    CREATE_FAILURE_MESSAGE,
    EDIT_FAILURE_MESSAGE,
    makeProblem,
    TITLE_MAX_LENGTH,
    TITLE_REQUIRED_MESSAGE,
} from "../fixtures";

type Input = { title: string; description: string };

// Promessa controlada pelo teste: permite olhar a tela enquanto o envio ainda está em andamento
function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

function renderModal(props: Partial<ComponentProps<typeof CreateProblemModal>> = {}) {
    const onSubmit = vi.fn<(input: Input) => Promise<void>>().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<CreateProblemModal onSubmit={onSubmit} onClose={onClose} {...props} />);

    return {
        user,
        onSubmit,
        onClose,
        titleInput: screen.getByLabelText(/título/i),
        descriptionInput: screen.getByLabelText(/descrição/i),
        // "Criar" na criação e "Salvar" na edição; o nome muda para "Criando..." durante o envio
        submitButton: screen.getByRole("button", { name: /^(criar|salvar)$/i }),
    };
}

describe("[US05] CreateProblemModal", () => {
    it("Deve abrir como diálogo \"Criar Problema\" com título e descrição vazios", () => {
        const { titleInput, descriptionInput } = renderModal();

        expect(screen.getByRole("dialog", { name: "Criar Problema" })).toBeInTheDocument();
        expect(titleInput).toHaveValue("");
        expect(descriptionInput).toHaveValue("");
        // O pré-set só é oferecido na edição
        expect(screen.queryByRole("button", { name: /editar pré-set/i })).not.toBeInTheDocument();
    });

    // --- VALIDAÇÃO DO TÍTULO ---

    it("[QA] Deve bloquear título vazio com alerta e sem chamar onSubmit", async () => {
        const { user, onSubmit, onClose, submitButton } = renderModal();

        await user.click(submitButton);

        expect(await screen.findByRole("alert")).toHaveTextContent(TITLE_REQUIRED_MESSAGE);
        expect(onSubmit).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });

    it("[QA] Deve bloquear título com apenas espaços, como o @NotBlank do backend", async () => {
        const { user, onSubmit, titleInput, submitButton } = renderModal();

        await user.type(titleInput, "     ");
        await user.click(submitButton);

        expect(await screen.findByRole("alert")).toHaveTextContent(TITLE_REQUIRED_MESSAGE);
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it("Deve limpar o alerta assim que o tutor volta a digitar o título", async () => {
        const { user, titleInput, submitButton } = renderModal();

        await user.click(submitButton);
        expect(await screen.findByRole("alert")).toBeInTheDocument();

        await user.type(titleInput, "P");

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("Deve limitar o título a 100 caracteres no próprio campo", async () => {
        const { user, titleInput } = renderModal();

        expect(titleInput).toHaveAttribute("maxlength", String(TITLE_MAX_LENGTH));
        await user.type(titleInput, "x".repeat(TITLE_MAX_LENGTH + 1));

        expect(titleInput).toHaveValue("x".repeat(TITLE_MAX_LENGTH));
    });

    // --- ENVIO ---

    it("Deve enviar título e descrição sem as pontas em branco e deixar o fechamento para a página", async () => {
        const { user, onSubmit, onClose, titleInput, descriptionInput, submitButton } = renderModal();

        await user.type(titleInput, "  Problema 1  ");
        await user.type(descriptionInput, "  Prototipação do PRD  ");
        await user.click(submitButton);

        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit).toHaveBeenCalledWith({ title: "Problema 1", description: "Prototipação do PRD" });
        // Quem fecha (ou navega para o pré-set) é a página, não o modal
        expect(onClose).not.toHaveBeenCalled();
    });

    it("Deve enviar descrição vazia quando o tutor só preenche o título", async () => {
        const { user, onSubmit, titleInput, submitButton } = renderModal();

        await user.type(titleInput, "Problema 1");
        await user.click(submitButton);

        expect(onSubmit).toHaveBeenCalledWith({ title: "Problema 1", description: "" });
    });

    it("Deve mostrar \"Criando...\" e travar campos e fechamento enquanto o envio está pendente", async () => {
        const pending = deferred<void>();
        const { user, onSubmit, titleInput, descriptionInput, submitButton } = renderModal();
        onSubmit.mockReturnValue(pending.promise);

        await user.type(titleInput, "Problema 1");
        await user.click(submitButton);

        const busyButton = await screen.findByRole("button", { name: /criando\.\.\./i });
        // Sem isto um segundo toque criaria o problema em duplicidade
        expect(busyButton).toBeDisabled();
        expect(titleInput).toBeDisabled();
        expect(descriptionInput).toBeDisabled();
        expect(screen.getByRole("button", { name: /fechar modal/i })).toBeDisabled();

        await act(async () => pending.resolve());
    });

    it("Deve fechar com Esc, mas ignorar o Esc enquanto o envio está pendente", async () => {
        const pending = deferred<void>();
        const { user, onSubmit, onClose, titleInput, submitButton } = renderModal();
        onSubmit.mockReturnValue(pending.promise);

        await user.keyboard("{Escape}");
        expect(onClose).toHaveBeenCalledTimes(1);

        await user.type(titleInput, "Problema 1");
        await user.click(submitButton);
        await screen.findByRole("button", { name: /criando\.\.\./i });
        await user.keyboard("{Escape}");

        // Fechar no meio da criação perderia o problema
        expect(onClose).toHaveBeenCalledTimes(1);
        await act(async () => pending.resolve());
    });

    it("Deve fechar pelo botão X quando não há envio em andamento", async () => {
        const { user, onClose } = renderModal();

        await user.click(screen.getByRole("button", { name: /fechar modal/i }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("Deve exibir \"Não foi possível criar o problema\" e manter o modal aberto quando o envio falha", async () => {
        const { user, onSubmit, onClose, titleInput, descriptionInput, submitButton } = renderModal();
        onSubmit.mockRejectedValue(new Error("Falha ao criar o problema."));

        await user.type(titleInput, "Problema 1");
        await user.click(submitButton);

        expect(await screen.findByRole("alert")).toHaveTextContent(CREATE_FAILURE_MESSAGE);
        expect(onClose).not.toHaveBeenCalled();
        // O tutor pode corrigir e tentar de novo: campos e botão voltam a ficar disponíveis
        expect(titleInput).toBeEnabled();
        expect(descriptionInput).toBeEnabled();
        expect(screen.getByRole("button", { name: /^criar$/i })).toBeEnabled();
        expect(titleInput).toHaveValue("Problema 1");
    });

    // --- EDIÇÃO ---

    it("Deve abrir preenchido como \"Editar Problema\", com o botão Salvar e acesso ao pré-set", async () => {
        const onEditPreset = vi.fn();
        const { user, titleInput, descriptionInput } = renderModal({ problem: makeProblem(), onEditPreset });

        expect(screen.getByRole("dialog", { name: "Editar Problema" })).toBeInTheDocument();
        expect(titleInput).toHaveValue(makeProblem().title);
        expect(descriptionInput).toHaveValue(makeProblem().description);

        await user.click(screen.getByRole("button", { name: /editar pré-set de critérios/i }));
        expect(onEditPreset).toHaveBeenCalledTimes(1);
    });

    it("Deve usar a mensagem de \"salvar\" quando a edição falha", async () => {
        const { user, onSubmit, submitButton } = renderModal({ problem: makeProblem() });
        onSubmit.mockRejectedValue(new Error("Falha ao editar o problema."));

        await user.click(submitButton);

        expect(await screen.findByRole("alert")).toHaveTextContent(EDIT_FAILURE_MESSAGE);
    });

    it("Deve ocultar o acesso ao pré-set na criação, mesmo que a página passe o callback", () => {
        renderModal({ onEditPreset: vi.fn() });

        expect(screen.queryByRole("button", { name: /editar pré-set/i })).not.toBeInTheDocument();
    });
});