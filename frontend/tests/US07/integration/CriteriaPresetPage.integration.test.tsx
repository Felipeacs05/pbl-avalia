import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CriteriaPresetPage } from "@/components/features/performance-tables/CriteriaPresetPage";
import { criteriaPresetService } from "@/services/criteriaPresetService";
import {
    CRITERIA_INVALID_CHARACTERS_MESSAGE,
    CRITERIA_REQUIRED_MESSAGE,
    DUPLICATE_NAME_MESSAGE,
    INJECTION_NAMES,
    invalidSumText,
    NO_CRITERIA_MESSAGE,
    ROOM_ID,
    SAVED_MESSAGE,
    UNSAVED_CHANGES_MESSAGE,
    uniquePresetId,
} from "../fixtures";

// O pré-set vem do mock em memória (400 ms); as salas vêm do fetch (useRooms)
const WAIT = { timeout: 3000 };
const ROOMS_ROUTE = /\/api\/v1\/rooms$/;
const INITIAL_NAMES = ["Papel", "Participação", "Segmentos", "Comportamento"];

let fetchedUrls: string[];

function jsonResponse(body: unknown, status: number): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

async function fakeBackend(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const url = String(input);
    fetchedUrls.push(url);
    if ((init.method ?? "GET") === "GET" && ROOMS_ROUTE.test(url)) {
        return jsonResponse(
            [{ id: ROOM_ID, name: "Engenharia de Software", code: "TEC499", joinLink: "app/join/TEC499", semester: "2026.2" }],
            200,
        );
    }
    return jsonResponse({}, 404);
}

// Qualquer requisição além da lista de salas seria o pré-set indo ao backend antes de "Salvar"
const nonRoomRequests = () => fetchedUrls.filter((url) => !ROOMS_ROUTE.test(url));

type User = ReturnType<typeof userEvent.setup>;

async function renderPage(props: Partial<React.ComponentProps<typeof CriteriaPresetPage>> = {}) {
    const onBack = vi.fn();
    const onSaved = vi.fn();
    const presetId = props.presetId ?? uniquePresetId();
    const user = userEvent.setup();

    const view = render(
        <CriteriaPresetPage roomId={ROOM_ID} presetId={presetId} onBack={onBack} onSaved={onSaved} {...props} />,
    );
    await screen.findByRole("region", { name: "Critérios" }, WAIT);
    return { user, onBack, onSaved, presetId, ...view };
}

const criteriaItems = () => within(screen.getByRole("region", { name: "Critérios" })).getAllByRole("listitem");
// O primeiro <p> do card é o nome; o segundo é o peso
const namesOf = () => criteriaItems().map((item) => item.querySelector("p")?.textContent);
const total = () => screen.getByRole("status");
const saveButton = () => screen.getByRole("button", { name: "Salvar Pre-set" });

async function openAddModal(user: User) {
    await user.click(screen.getByRole("button", { name: "Adicionar Critério" }));
    return within(screen.getByRole("dialog", { name: "Adicionar Critério" }));
}

// Colar em vez de digitar: aceita qualquer caractere e deixa a sequência de 15 adições rápida
async function addCriterion(user: User, name: string, weight = "0") {
    const dialog = await openAddModal(user);
    if (name) {
        await user.click(dialog.getByLabelText("Nome do critério"));
        await user.paste(name);
    }
    fireEvent.change(dialog.getByLabelText(/peso/i), { target: { value: weight } });
    await user.click(dialog.getByRole("button", { name: "Adicionar" }));
}

beforeEach(() => {
    fetchedUrls = [];
    vi.stubGlobal("fetch", vi.fn(fakeBackend));
});

describe("[US07] Integração da CriteriaPresetPage", () => {
    it("Deve carregar o pré-set inicial com a soma em verde, os toggles à parte e o salvamento desabilitado", async () => {
        await renderPage();

        expect(namesOf()).toEqual(INITIAL_NAMES);
        expect(within(criteriaItems()[0]).getByText("Peso 25%")).toBeInTheDocument();
        expect(screen.getByRole("switch", { name: "Auto Avaliação" })).toHaveAttribute("aria-checked", "true");
        expect(screen.getByRole("switch", { name: "Avaliação em pares" })).toHaveAttribute("aria-checked", "true");
        expect(total()).toHaveTextContent("100%");
        expect(total().className).toMatch(/text-green-/);
        expect(saveButton()).toBeDisabled();
        expect(screen.queryByText(UNSAVED_CHANGES_MESSAGE)).not.toBeInTheDocument();
    });

    // --- SPA (CT-FE-01 / CT-FE-02) ---

    it("[QA] Deve incluir o critério na lista na hora, sem recarregar a página nem chamar o backend (CT-FE-01)", async () => {
        const { user } = await renderPage();
        const papelBefore = screen.getByRole("button", { name: "Editar Papel" });
        const hrefBefore = window.location.href;

        await addCriterion(user, "Pesquisa", "5");

        expect(namesOf()).toEqual([...INITIAL_NAMES, "Pesquisa"]);
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        // Mesmo nó do DOM: a página não foi remontada nem recarregada
        expect(screen.getByRole("button", { name: "Editar Papel" })).toBe(papelBefore);
        expect(window.location.href).toBe(hrefBefore);
        expect(nonRoomRequests()).toEqual([]);
        // 100% + 5%: a soma reage e avisa que o servidor recusaria
        expect(total()).toHaveTextContent("105%");
        expect(total().className).toMatch(/text-red-/);
        expect(screen.getByText(UNSAVED_CHANGES_MESSAGE)).toBeInTheDocument();
        expect(saveButton()).toBeEnabled();
    });

    it("[QA] Deve remover o critério da lista na hora, mantendo os outros e sem recarregar a página (CT-FE-02)", async () => {
        const { user } = await renderPage();
        const papelBefore = screen.getByRole("button", { name: "Editar Papel" });
        const comportamentoBefore = screen.getByRole("button", { name: "Editar Comportamento" });

        await user.click(screen.getByRole("button", { name: "Remover Segmentos" }));

        expect(namesOf()).toEqual(["Papel", "Participação", "Comportamento"]);
        expect(screen.getByRole("button", { name: "Editar Papel" })).toBe(papelBefore);
        expect(screen.getByRole("button", { name: "Editar Comportamento" })).toBe(comportamentoBefore);
        expect(nonRoomRequests()).toEqual([]);
        expect(total()).toHaveTextContent("75%");
        expect(total().className).toMatch(/text-red-/);
    });

    it("Deve manter o Papel sem lixeira, deixando editar só o peso dele", async () => {
        const { user } = await renderPage();

        expect(screen.queryByRole("button", { name: "Remover Papel" })).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Editar Papel" }));
        const dialog = within(screen.getByRole("dialog", { name: "Editar Critério" }));
        expect(dialog.getByLabelText("Nome do critério")).toHaveAttribute("readonly");
        fireEvent.change(dialog.getByLabelText(/peso/i), { target: { value: "30" } });
        await user.click(dialog.getByRole("button", { name: "Salvar" }));

        expect(within(criteriaItems()[0]).getByText("Peso 30%")).toBeInTheDocument();
        expect(total()).toHaveTextContent("105%");
    });

    it("[QA] Deve adicionar e remover 15 critérios em sequência sem deixar itens órfãos nem inconsistência (CT-BND-04)", async () => {
        const { user } = await renderPage();

        for (let i = 1; i <= 15; i++) {
            await addCriterion(user, `Critério ${i}`);
            expect(criteriaItems()).toHaveLength(4 + i);
        }
        // Peso 0 em todos: a soma continua 100%
        expect(total()).toHaveTextContent("100%");

        for (let i = 15; i >= 1; i--) {
            await user.click(screen.getByRole("button", { name: `Remover Critério ${i}` }));
            expect(criteriaItems()).toHaveLength(3 + i);
        }

        expect(namesOf()).toEqual(INITIAL_NAMES);
        expect(screen.queryByText(/^Critério \d+$/)).not.toBeInTheDocument();
        expect(nonRoomRequests()).toEqual([]);
    }, 30_000);

    it("Deve editar o peso de um critério e atualizar a soma", async () => {
        const { user } = await renderPage();

        await user.click(screen.getByRole("button", { name: "Editar Segmentos" }));
        const dialog = within(screen.getByRole("dialog", { name: "Editar Critério" }));
        fireEvent.change(dialog.getByLabelText(/peso/i), { target: { value: "30" } });
        await user.click(dialog.getByRole("button", { name: "Salvar" }));

        expect(within(criteriaItems()[2]).getByText("Peso 30%")).toBeInTheDocument();
        expect(total()).toHaveTextContent("105%");
    });

    it("Deve alternar o toggle de Auto Avaliação sem mudar a soma e habilitar o salvamento", async () => {
        const { user } = await renderPage();
        const toggle = screen.getByRole("switch", { name: "Auto Avaliação" });

        await user.click(toggle);

        expect(toggle).toHaveAttribute("aria-checked", "false");
        expect(total()).toHaveTextContent("100%");
        expect(saveButton()).toBeEnabled();
    });

    // --- VALIDAÇÕES (CT-FE-03 / CT-BND-03) ---

    it.each(["", "   "])("Deve bloquear o nome %j sem adicionar nada, sem rede e com o modal aberto (CT-FE-03)", async (name) => {
        const { user } = await renderPage();

        await addCriterion(user, name);

        expect(within(screen.getByRole("dialog")).getByRole("alert")).toBeInTheDocument();
        expect(namesOf()).toEqual(INITIAL_NAMES);
        expect(nonRoomRequests()).toEqual([]);
        // Nada mudou: o salvamento segue desabilitado
        expect(saveButton()).toBeDisabled();
    });

    it("[QA] Deve avisar com a mensagem do plano quando o nome está vazio (CT-FE-03)", async () => {
        const { user } = await renderPage();

        await addCriterion(user, "");

        expect(within(screen.getByRole("dialog")).getByRole("alert")).toHaveTextContent(CRITERIA_REQUIRED_MESSAGE);
    });

    it("Deve recusar o nome repetido, sem diferenciar maiúsculas, e deixar a lista como estava (CT-BND-03)", async () => {
        const { user } = await renderPage();

        await addCriterion(user, "participação");

        expect(within(screen.getByRole("dialog")).getByRole("alert")).toHaveTextContent(DUPLICATE_NAME_MESSAGE);
        expect(namesOf()).toEqual(INITIAL_NAMES);
    });

    it("Deve recusar renomear um critério com o nome de outro e aceitar manter o próprio nome", async () => {
        const { user } = await renderPage();

        await user.click(screen.getByRole("button", { name: "Editar Segmentos" }));
        let dialog = within(screen.getByRole("dialog", { name: "Editar Critério" }));
        fireEvent.change(dialog.getByLabelText("Nome do critério"), { target: { value: "participação" } });
        await user.click(dialog.getByRole("button", { name: "Salvar" }));
        expect(dialog.getByRole("alert")).toHaveTextContent(DUPLICATE_NAME_MESSAGE);

        fireEvent.change(dialog.getByLabelText("Nome do critério"), { target: { value: "Segmentos" } });
        await user.click(dialog.getByRole("button", { name: "Salvar" }));

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(namesOf()).toEqual(INITIAL_NAMES);
        dialog = within(document.body);
    });

    // CT-FE-04 / CT-BE-05
    it.each(INJECTION_NAMES.slice(0, 3))("[QA] Deve bloquear o nome com caracteres inválidos %j e não listá-lo", async (name) => {
        const { user } = await renderPage();

        await addCriterion(user, name);

        expect(within(screen.getByRole("dialog")).getByRole("alert")).toHaveTextContent(CRITERIA_INVALID_CHARACTERS_MESSAGE);
        expect(namesOf()).toEqual(INITIAL_NAMES);
        expect(nonRoomRequests()).toEqual([]);
    });

    // --- SALVAR ---

    it("Deve habilitar o salvamento sem mudanças quando allowSaveWithoutChanges está ativo e chamar onSaved", async () => {
        const { user, onSaved } = await renderPage({ allowSaveWithoutChanges: true });
        expect(saveButton()).toBeEnabled();

        await user.click(saveButton());

        await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1), WAIT);
        expect(await screen.findByText(SAVED_MESSAGE)).toBeInTheDocument();
    });

    it("Deve salvar a lista editada, chamar onSaved, zerar as alterações pendentes e manter o pré-set ao reabrir", async () => {
        const { user, onSaved, presetId, unmount } = await renderPage();
        await addCriterion(user, "Pesquisa");

        await user.click(saveButton());

        await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1), WAIT);
        expect(await screen.findByText(SAVED_MESSAGE)).toBeInTheDocument();
        expect(screen.queryByText(UNSAVED_CHANGES_MESSAGE)).not.toBeInTheDocument();
        expect(saveButton()).toBeDisabled();

        // Reabrir o mesmo problema: o critério gravado volta; outro problema nasce com o pré-set inicial
        unmount();
        await renderPage({ presetId });
        expect(namesOf()).toEqual([...INITIAL_NAMES, "Pesquisa"]);
    });

    it("Deve mostrar a recusa da soma, não chamar onSaved e manter as alterações quando os pesos não somam 100%", async () => {
        const { user, onSaved } = await renderPage();
        await addCriterion(user, "Pesquisa", "5");

        await user.click(saveButton());

        expect(await screen.findByText(invalidSumText(105), undefined, WAIT)).toBeInTheDocument();
        expect(onSaved).not.toHaveBeenCalled();
        expect(namesOf()).toEqual([...INITIAL_NAMES, "Pesquisa"]);
        expect(screen.getByText(UNSAVED_CHANGES_MESSAGE)).toBeInTheDocument();
    });

    it("[QA] Deve bloquear o salvamento da tabela sem nenhum critério, avisando o mínimo de um (CT-BND-06)", async () => {
        // Lista vazia: o pré-set simulado volta sem critérios
        vi.spyOn(criteriaPresetService, "fetchPreset").mockResolvedValue([]);
        const save = vi.spyOn(criteriaPresetService, "savePreset");
        const { user, onSaved } = await renderPage({ allowSaveWithoutChanges: true });
        expect(screen.getByText("Nenhum critério cadastrado.")).toBeInTheDocument();

        await user.click(saveButton());

        // O bloqueio é da tela: nada deve chegar ao service
        expect(await screen.findByText(NO_CRITERIA_MESSAGE)).toBeInTheDocument();
        expect(save).not.toHaveBeenCalled();
        expect(onSaved).not.toHaveBeenCalled();
    });

    it("Deve acionar onBack pelo botão Voltar", async () => {
        const { user, onBack } = await renderPage();

        await user.click(screen.getByRole("button", { name: "Voltar" }));

        expect(onBack).toHaveBeenCalledTimes(1);
    });
});