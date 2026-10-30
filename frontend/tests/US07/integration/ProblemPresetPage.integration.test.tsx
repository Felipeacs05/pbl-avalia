import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProblemCriteriaPresetPage from "@/app/teacher-rooms/[id]/problems/[problemId]/preset/page";

// A rota lê id e problemId da URL: o mock global do setup devolve {}, então este arquivo define o seu
const ids = vi.hoisted(() => ({
    roomId: "550e8400-e29b-41d4-a716-446655440000",
    problemId: "555e5555-e55b-55d5-a555-555555555555",
}));
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: router.push, replace: router.replace, prefetch: () => {}, back: () => {} }),
    useParams: () => ({ id: ids.roomId, problemId: ids.problemId }),
    usePathname: () => "/",
    useSearchParams: () => new URLSearchParams(),
}));

const PROBLEM_PATH = `/teacher-rooms/${ids.roomId}/problems/${ids.problemId}`;
const WAIT = { timeout: 3000 };

beforeEach(() => {
    vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
            new Response(
                JSON.stringify([
                    { id: ids.roomId, name: "Engenharia de Software", code: "TEC499", joinLink: "app/join/TEC499", semester: "2026.2" },
                ]),
                { status: 200, headers: { "Content-Type": "application/json" } },
            ),
        ),
    );
});

describe("[US07] Página do Pré-set do problema", () => {
    it("Deve exibir o pré-set do problema criado e o selo da sala", async () => {
        render(<ProblemCriteriaPresetPage />);

        expect(await screen.findByRole("region", { name: "Critérios" }, WAIT)).toBeInTheDocument();
        expect(screen.getByText("Papel")).toBeInTheDocument();
        expect(await screen.findByText("TEC499 - 2026.2")).toBeInTheDocument();
    });

    it("Deve voltar para a tela do problema pelo botão Voltar", async () => {
        const user = userEvent.setup();
        render(<ProblemCriteriaPresetPage />);
        await screen.findByRole("region", { name: "Critérios" }, WAIT);

        await user.click(screen.getByRole("button", { name: "Voltar" }));

        expect(router.push).toHaveBeenCalledWith(PROBLEM_PATH);
    });

    it("Deve aceitar o pré-set padrão sem mexer e ir para o problema com replace, sem reabrir o Pré-set no voltar", async () => {
        const user = userEvent.setup();
        render(<ProblemCriteriaPresetPage />);
        await screen.findByRole("region", { name: "Critérios" }, WAIT);

        // O problema já existe: o botão nasce ativo (allowSaveWithoutChanges)
        const save = screen.getByRole("button", { name: "Salvar Pre-set" });
        expect(save).toBeEnabled();
        await user.click(save);

        await waitFor(() => expect(router.replace).toHaveBeenCalledWith(PROBLEM_PATH), WAIT);
        expect(router.push).not.toHaveBeenCalled();
    });
});