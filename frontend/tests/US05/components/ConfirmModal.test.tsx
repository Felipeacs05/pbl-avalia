import { describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ACTION_FAILURE_MESSAGE } from "../fixtures";

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

function renderModal(props: Partial<ComponentProps<typeof ConfirmModal>> = {}) {
    const onConfirm = vi.fn<() => void | Promise<void>>().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
        <ConfirmModal
            title="Excluir problema"
            message={
                <>
                    Tem certeza que deseja excluir <strong>Problema 1</strong>? Essa ação não pode ser desfeita.
                </>
            }
            confirmLabel="Excluir"
            onConfirm={onConfirm}
            onClose={onClose}
            {...props}
        />,
    );

    return {
        user,
        onConfirm,
        onClose,
        dialog: screen.getByRole("alertdialog"),
        confirmButton: screen.getByRole("button", { name: /^excluir$/i }),
        cancelButton: screen.getByRole("button", { name: /^cancelar$/i }),
        closeButton: screen.getByRole("button", { name: /^fechar$/i }),
    };
}

describe("[US05] ConfirmModal", () => {
    it("Deve abrir como alertdialog nomeado pelo título e descrito pela mensagem", () => {
        const { dialog } = renderModal();

        expect(dialog).toHaveAccessibleName("Excluir problema");
        expect(dialog).toHaveAccessibleDescription(/tem certeza que deseja excluir problema 1/i);
    });

    it("Deve usar o rótulo de cancelar personalizado", () => {
        renderModal({ cancelLabel: "Voltar" });

        expect(screen.getByRole("button", { name: /^voltar$/i })).toBeInTheDocument();
    });

    // --- VARIANTE ---

    it("Deve começar com o foco em \"Cancelar\" na variante danger, para o Enter não excluir por acidente", () => {
        const { cancelButton, confirmButton } = renderModal({ variant: "danger" });

        expect(cancelButton).toHaveFocus();
        expect(confirmButton.className).toMatch(/bg-red-/);
    });

    it("Deve começar com o foco no botão de confirmar na variante padrão", () => {
        const { confirmButton } = renderModal();

        expect(confirmButton).toHaveFocus();
        expect(confirmButton.className).not.toMatch(/bg-red-/);
    });

    // --- FECHAMENTO ---

    it("Deve fechar com Esc, pelo botão X, por \"Cancelar\" e clicando no fundo", async () => {
        const { user, onClose, dialog, cancelButton, closeButton } = renderModal();

        await user.keyboard("{Escape}");
        await user.click(closeButton);
        await user.click(cancelButton);
        await user.click(dialog);

        expect(onClose).toHaveBeenCalledTimes(4);
    });

    it("Deve manter o modal aberto ao clicar dentro do cartão", async () => {
        const { user, onClose } = renderModal();

        await user.click(screen.getByRole("heading", { name: "Excluir problema" }));

        // stopPropagation: só o fundo escuro fecha
        expect(onClose).not.toHaveBeenCalled();
    });

    // --- CONFIRMAÇÃO ---

    it("Deve chamar onConfirm uma vez e deixar o fechamento para a página", async () => {
        const { user, onConfirm, onClose, confirmButton } = renderModal();

        await user.click(confirmButton);

        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(onClose).not.toHaveBeenCalled();
    });

    it("Deve mostrar o spinner e travar tudo enquanto a ação assíncrona está pendente", async () => {
        const pending = deferred<void>();
        const { user, onConfirm, onClose, dialog, confirmButton, cancelButton, closeButton } = renderModal();
        onConfirm.mockReturnValue(pending.promise);

        await user.click(confirmButton);

        expect(confirmButton).toBeDisabled();
        expect(cancelButton).toBeDisabled();
        expect(closeButton).toBeDisabled();
        expect(dialog.querySelector(".animate-spin")).not.toBeNull();

        // Esc e clique no fundo também não podem fechar no meio da ação
        await user.keyboard("{Escape}");
        await user.click(dialog);
        await user.click(confirmButton);
        expect(onClose).not.toHaveBeenCalled();
        expect(onConfirm).toHaveBeenCalledTimes(1);

        await act(async () => pending.resolve());
    });

    it("Deve exibir \"Não foi possível concluir a ação\" e liberar os botões quando a ação falha", async () => {
        const { user, onConfirm, onClose, dialog, confirmButton, cancelButton } = renderModal();
        onConfirm.mockRejectedValue(new Error("Falha ao excluir o problema."));

        await user.click(confirmButton);

        expect(await screen.findByRole("alert")).toHaveTextContent(ACTION_FAILURE_MESSAGE);
        expect(onClose).not.toHaveBeenCalled();
        expect(confirmButton).toBeEnabled();
        expect(cancelButton).toBeEnabled();
        expect(dialog.querySelector(".animate-spin")).toBeNull();
    });

    it("Deve limpar o erro anterior ao tentar de novo", async () => {
        const pending = deferred<void>();
        const { user, onConfirm, confirmButton } = renderModal();
        onConfirm.mockRejectedValueOnce(new Error("falhou")).mockReturnValueOnce(pending.promise);

        await user.click(confirmButton);
        expect(await screen.findByRole("alert")).toBeInTheDocument();

        await user.click(confirmButton);

        // Um aviso velho junto de uma ação em andamento confundiria o tutor
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        await act(async () => pending.resolve());
    });
});