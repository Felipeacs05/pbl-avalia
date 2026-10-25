import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssessmentPanel } from "@/components/AssessmentPanel";
import { CLOSED_LABEL, OPEN_LABEL, PROBLEM_ID } from "../fixtures";

const RELEASE_URL = `/api/v1/problems/${PROBLEM_ID}/self-assessment-release`;
const TOKEN = "token-do-tutor";

// O plano de testes fixa os ids do DOM (POM): aqui eles são o contrato, então a busca é por id
const label = () => document.getElementById("statusAssessmentLabel");
const toast = () => document.getElementById("toastNotification");
const selfForm = () => document.getElementById("formSelfAssessment");

function okResponse() {
    return new Response(null, { status: 200 });
}

function callsWithMethod(method: string) {
    return vi
        .mocked(fetch)
        .mock.calls.filter(([, init]) => init?.method === method)
        .map(([url, init]) => ({
            url: String(url),
            headers: (init?.headers ?? {}) as Record<string, string>,
            body: init?.body ? JSON.parse(String(init.body)) : undefined,
        }));
}

function renderPanel(isTutor = true, peers: Array<{ id: string; name: string }> = []) {
    const user = userEvent.setup();
    const view = render(<AssessmentPanel problemId={PROBLEM_ID} isTutor={isTutor} peers={peers} />);
    const toggleButton = () => screen.getByRole("button", { name: /toggle autoavaliação/i });
    // Mesma instância, outro perfil: o estado interno (liberado) é preservado entre os dois renders
    const switchToStudent = () =>
        view.rerender(<AssessmentPanel problemId={PROBLEM_ID} isTutor={false} peers={peers} />);
    return { user, toggleButton, switchToStudent };
}

beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("token", TOKEN);
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => okResponse()));
    vi.spyOn(window, "alert").mockImplementation(() => {});
});

describe("[US12] AssessmentPanel (legado)", () => {
    it("Deve iniciar com \"Avaliações Fechadas\", sem aviso de erro e sem formulário para o tutor", () => {
        renderPanel(true);

        expect(label()).toHaveTextContent(CLOSED_LABEL);
        expect(toast()).toBeNull();
        expect(selfForm()).toBeNull();
    });

    it("Deve fazer PATCH da liberação com o token e trocar o rótulo para \"Avaliações Abertas\"", async () => {
        const { user, toggleButton } = renderPanel(true);

        await user.click(toggleButton());

        await waitFor(() => expect(label()).toHaveTextContent(OPEN_LABEL));
        const patches = callsWithMethod("PATCH");
        expect(patches).toHaveLength(1);
        expect(patches[0].url).toBe(RELEASE_URL);
        // O tutor é identificado pelo token, não pelo corpo
        expect(patches[0].headers.Authorization).toBe(`Bearer ${TOKEN}`);
        expect(toast()).toBeNull();
    });

    it("Deve voltar a \"Avaliações Fechadas\" ao alternar uma segunda vez", async () => {
        const { user, toggleButton } = renderPanel(true);

        await user.click(toggleButton());
        await waitFor(() => expect(label()).toHaveTextContent(OPEN_LABEL));
        await user.click(toggleButton());

        await waitFor(() => expect(label()).toHaveTextContent(CLOSED_LABEL));
        expect(callsWithMethod("PATCH")).toHaveLength(2);
    });

    it("[QA] Deve manter \"Avaliações Fechadas\" e exibir #toastNotification quando a API responde 500", async () => {
        vi.mocked(fetch).mockImplementation(async () => new Response(null, { status: 500 }));
        const { user, toggleButton } = renderPanel(true);

        await user.click(toggleButton());

        await waitFor(() => expect(toast()).not.toBeNull());
        expect(toast()).toHaveTextContent(/erro ao alterar status/i);
        // O estado só muda quando o servidor confirma
        expect(label()).toHaveTextContent(CLOSED_LABEL);
    });

    it("[QA] Deve manter \"Avaliações Fechadas\" e exibir #toastNotification quando a rede falha", async () => {
        vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));
        const { user, toggleButton } = renderPanel(true);

        await user.click(toggleButton());

        await waitFor(() => expect(toast()).not.toBeNull());
        expect(label()).toHaveTextContent(CLOSED_LABEL);
    });

    it("[QA] Deve identificar o botão do tutor como toggleSelfAssessment_{id}", () => {
        renderPanel(true);

        // Contrato do plano: o sufixo com o id permite vários problemas na mesma tela
        expect(document.getElementById(`toggleSelfAssessment_${PROBLEM_ID}`)).not.toBeNull();
    });

    it("Deve exibir o formulário de autoavaliação ao aluno só depois da liberação", async () => {
        const { user, toggleButton, switchToStudent } = renderPanel(true);
        await user.click(toggleButton());
        await waitFor(() => expect(label()).toHaveTextContent(OPEN_LABEL));

        switchToStudent();

        expect(selfForm()).not.toBeNull();
        expect(screen.getByRole("button", { name: "Enviar Autoavaliação" })).toBeInTheDocument();
    });

    it("Deve enviar a nota como número e o comentário no POST da autoavaliação, com o token", async () => {
        const { user, toggleButton, switchToStudent } = renderPanel(true);
        await user.click(toggleButton());
        await waitFor(() => expect(label()).toHaveTextContent(OPEN_LABEL));
        switchToStudent();

        await user.type(screen.getByRole("spinbutton"), "9.5");
        await user.type(screen.getByRole("textbox"), "Participei ativamente");
        await user.click(screen.getByRole("button", { name: "Enviar Autoavaliação" }));

        await waitFor(() => expect(callsWithMethod("POST")).toHaveLength(1));
        const [post] = callsWithMethod("POST");
        expect(post.body).toEqual({ score: 9.5, comment: "Participei ativamente" });
        expect(post.headers.Authorization).toBe(`Bearer ${TOKEN}`);
        expect(window.alert).toHaveBeenCalled();
    });

    it("[QA] Deve enviar a autoavaliação para /self-assessments, a rota do plano de testes", async () => {
        const { user, toggleButton, switchToStudent } = renderPanel(true);
        await user.click(toggleButton());
        await waitFor(() => expect(label()).toHaveTextContent(OPEN_LABEL));
        switchToStudent();

        await user.type(screen.getByRole("spinbutton"), "9.5");
        await user.type(screen.getByRole("textbox"), "Participei ativamente");
        await user.click(screen.getByRole("button", { name: "Enviar Autoavaliação" }));

        await waitFor(() => expect(callsWithMethod("POST")).toHaveLength(1));
        expect(callsWithMethod("POST")[0].url).toBe(`/api/v1/problems/${PROBLEM_ID}/self-assessments`);
    });

    it("[QA] Deve liberar a avaliação de pares e exibir a lista de colegas ao aluno", async () => {
        const peers = [{ id: "p1", name: "Bruno Lima" }];
        const { user, switchToStudent } = renderPanel(true, peers);

        // O plano prevê PATCH /peer-assessment-release: o tutor precisa de um controle para ele
        const peerToggle = screen.queryByRole("button", { name: /pares/i });
        expect(peerToggle, "o painel do tutor não tem controle de liberação de pares").not.toBeNull();
        await user.click(peerToggle!);
        switchToStudent();

        expect(document.getElementById("listPeerStudents")).not.toBeNull();
        expect(screen.getByText("Bruno Lima")).toBeInTheDocument();
    });
});