import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
    CriterionFormModal,
    validateCriterionName,
} from "@/components/features/performance-tables/CriterionFormModal";
import type { CriterionInput } from "@/hooks/useCriteriaPreset";
import type { PresetCriterion } from "@/types/performanceTable";
import {
    CRITERIA_INVALID_CHARACTERS_MESSAGE,
    CRITERIA_REQUIRED_MESSAGE,
    DUPLICATE_NAME_MESSAGE,
    INJECTION_NAMES,
    makeFixedCriterion,
    makePresetCriterion,
    NAME_MAX_PLAN,
    NAME_MAX_UI,
    VALID_NAMES,
    WEIGHT_INVALID_MESSAGE,
    WEIGHT_MAX,
    WEIGHT_MIN,
} from "../fixtures";

function renderModal({
                         criterion = null as PresetCriterion | null,
                         existingNames = [] as string[],
                         isOpen = true,
                     } = {}) {
    const onSubmit = vi.fn<(input: CriterionInput) => void>();
    const onClose = vi.fn();
    const user = userEvent.setup();

    const view = render(
        <CriterionFormModal
            isOpen={isOpen}
            criterion={criterion}
            existingNames={existingNames}
            onClose={onClose}
            onSubmit={onSubmit}
        />,
    );

    return { user, onSubmit, onClose, ...view };
}

const nameInput = () => screen.getByLabelText("Nome do critério");
const weightInput = () => screen.getByLabelText(/peso/i);
const submitButton = (label = "Adicionar") => screen.getByRole("button", { name: label });

// fireEvent.change: o jsdom não trava valores de input number, e evita interpretar chaves do user.type
const setWeight = (value: string) => fireEvent.change(weightInput(), { target: { value } });
const setRawName = (value: string) => fireEvent.change(nameInput(), { target: { value } });

describe("[US07] validateCriterionName", () => {
    it.each(["", "   ", "\t "])("Deve recusar o nome vazio ou só com espaços (%j)", (name) => {
        expect(validateCriterionName(name, [])).not.toBeNull();
    });

    it("Deve aceitar nomes válidos, inclusive com acento, hífen e 1 caractere", () => {
        VALID_NAMES.forEach((name) => expect(validateCriterionName(name, [])).toBeNull());
    });

    it("Deve recusar nome repetido sem diferenciar maiúsculas nem espaços nas pontas", () => {
        // Dois critérios iguais na mesma tabela confundiriam o tutor e o cálculo
        expect(validateCriterionName("  PARTICIPAÇÃO ", ["Participação"])).toMatch(DUPLICATE_NAME_MESSAGE);
        expect(validateCriterionName("segmentos", ["Participação", "Segmentos"])).toMatch(DUPLICATE_NAME_MESSAGE);
    });

    it("Deve comparar só com os nomes dos OUTROS critérios, permitindo manter o próprio nome na edição", () => {
        // Na edição o próprio nome fica fora de existingNames
        expect(validateCriterionName("Participação", ["Segmentos", "Comportamento"])).toBeNull();
    });

    it("[QA] Deve usar a mensagem do plano (CT-FE-03) quando o nome está vazio", () => {
        expect(validateCriterionName("   ", [])).toMatch(CRITERIA_REQUIRED_MESSAGE);
    });

    // CT-FE-04 / CT-BE-05: tags HTML, SQL e símbolos de controle não são caracteres permitidos
    it.each(INJECTION_NAMES)("[QA] Deve recusar o nome com caracteres inválidos %j", (name) => {
        const result = validateCriterionName(name, []);

        expect(result).not.toBeNull();
        expect(result ?? "").toMatch(CRITERIA_INVALID_CHARACTERS_MESSAGE);
    });
});

describe("[US07] CriterionFormModal", () => {
    // --- MODOS ---

    it("Deve abrir em modo adição com nome vazio, peso 0 e o botão Adicionar", () => {
        renderModal();

        expect(screen.getByRole("dialog", { name: "Adicionar Critério" })).toBeInTheDocument();
        expect(nameInput()).toHaveValue("");
        expect(weightInput()).toHaveValue(0);
        expect(submitButton("Adicionar")).toBeInTheDocument();
        expect(nameInput()).not.toHaveAttribute("readonly");
    });

    it("Deve abrir em modo edição com os dados do critério e o botão Salvar", () => {
        renderModal({ criterion: makePresetCriterion({ name: "Participação", weight: 25 }) });

        expect(screen.getByRole("dialog", { name: "Editar Critério" })).toBeInTheDocument();
        expect(nameInput()).toHaveValue("Participação");
        expect(weightInput()).toHaveValue(25);
        expect(submitButton("Salvar")).toBeInTheDocument();
    });

    it("Deve travar o nome do critério fixo e deixar só o peso editável", async () => {
        const { user, onSubmit } = renderModal({ criterion: makeFixedCriterion({ weight: 25 }) });

        // Papel não pode ser renomeado: o cálculo depende dele
        expect(nameInput()).toHaveAttribute("readonly");
        setWeight("30");
        await user.click(submitButton("Salvar"));

        expect(onSubmit).toHaveBeenCalledWith({ name: "Papel", weight: 30 });
    });

    it("Deve não renderizar nada e ignorar o Esc quando está fechado", async () => {
        const { user, container, onClose } = renderModal({ isOpen: false });

        await user.keyboard("{Escape}");

        expect(container).toBeEmptyDOMElement();
        expect(onClose).not.toHaveBeenCalled();
    });

    // --- ENVIO ---

    it("Deve enviar o nome sem espaços nas pontas e o peso como número, e depois fechar", async () => {
        const { user, onSubmit, onClose } = renderModal();

        await user.type(nameInput(), "  Pesquisa  ");
        setWeight("10");
        await user.click(submitButton());

        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit).toHaveBeenCalledWith({ name: "Pesquisa", weight: 10 });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("Deve enviar ao apertar Enter no campo de nome", async () => {
        const { user, onSubmit } = renderModal();

        await user.type(nameInput(), "Pesquisa{Enter}");

        // O form cobre o teclado: não depende do clique no botão
        expect(onSubmit).toHaveBeenCalledWith({ name: "Pesquisa", weight: 0 });
    });

    it("Deve aceitar na edição o próprio nome do critério, já que ele não entra em existingNames", async () => {
        const { user, onSubmit } = renderModal({
            criterion: makePresetCriterion({ name: "Participação", weight: 25 }),
            existingNames: ["Segmentos", "Comportamento"],
        });

        await user.click(submitButton("Salvar"));

        expect(onSubmit).toHaveBeenCalledWith({ name: "Participação", weight: 25 });
    });

    it.each(VALID_NAMES)("Deve aceitar o nome válido %j", async (name) => {
        const { user, onSubmit } = renderModal();

        await user.type(nameInput(), name);
        await user.click(submitButton());

        expect(onSubmit).toHaveBeenCalledWith({ name, weight: 0 });
    });

    // --- NOME ---

    it.each(["", "   "])("Deve bloquear o envio com o nome %j, avisar em alerta e manter o modal aberto", async (typed) => {
        const { user, onSubmit, onClose } = renderModal();

        if (typed) await user.type(nameInput(), typed);
        await user.click(submitButton());

        expect(screen.getByRole("alert")).toHaveTextContent(/nome do critério/i);
        expect(nameInput()).toHaveAttribute("aria-invalid", "true");
        expect(onSubmit).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });

    it("Deve bloquear o nome repetido de OUTRO critério, sem diferenciar maiúsculas", async () => {
        const { user, onSubmit, onClose } = renderModal({ existingNames: ["Participação", "Segmentos"] });

        await user.type(nameInput(), "segmentos");
        await user.click(submitButton());

        expect(screen.getByRole("alert")).toHaveTextContent(DUPLICATE_NAME_MESSAGE);
        expect(onSubmit).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });

    it("Deve limitar a digitação do nome ao maxLength atual do campo", async () => {
        const { user } = renderModal();

        await user.type(nameInput(), "A".repeat(NAME_MAX_UI + 1));

        // Se o limite mudar (ver o teste [QA] do plano), atualize NAME_MAX_UI no fixtures
        expect(nameInput()).toHaveAttribute("maxlength", String(NAME_MAX_UI));
        expect(nameInput()).toHaveValue("A".repeat(NAME_MAX_UI));
    });

    it("[QA] Deve limitar o nome a 255 caracteres, como no CT-BND-01 do plano", () => {
        renderModal();

        // O plano manda restringir por maxlength="255" no front; o modal usa 60
        expect(nameInput()).toHaveAttribute("maxlength", String(NAME_MAX_PLAN));
    });

    it("Deve limpar o alerta do nome assim que o tutor volta a digitar", async () => {
        const { user } = renderModal();

        await user.click(submitButton());
        expect(screen.getByRole("alert")).toBeInTheDocument();
        await user.type(nameInput(), "P");

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(nameInput()).toHaveAttribute("aria-invalid", "false");
    });

    // CT-FE-04: o bloqueio precisa acontecer antes de qualquer envio
    it.each(INJECTION_NAMES)("[QA] Deve bloquear o envio do nome com caracteres inválidos %j", async (name) => {
        const { user, onSubmit, onClose } = renderModal();

        setRawName(name);
        await user.click(submitButton());

        expect(screen.getByRole("alert")).toHaveTextContent(CRITERIA_INVALID_CHARACTERS_MESSAGE);
        expect(onSubmit).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });

    // --- PESO ---

    // Inclusivo nos dois extremos: o CT-BND-05 recusa só o que está fora de 0 a 100
    it.each([WEIGHT_MIN, 1, 50, WEIGHT_MAX])("Deve aceitar o peso inteiro %i", async (weight) => {
        const { user, onSubmit } = renderModal();

        await user.type(nameInput(), "Pesquisa");
        setWeight(String(weight));
        await user.click(submitButton());

        expect(onSubmit).toHaveBeenCalledWith({ name: "Pesquisa", weight });
    });

    it.each([WEIGHT_MIN - 1, WEIGHT_MAX + 1, 1.5, 1000])(
        "Deve bloquear o peso %f, avisar em alerta e manter o modal aberto",
        async (weight) => {
            const { user, onSubmit, onClose } = renderModal();

            await user.type(nameInput(), "Pesquisa");
            setWeight(String(weight));
            await user.click(submitButton());

            expect(screen.getByRole("alert")).toHaveTextContent(WEIGHT_INVALID_MESSAGE);
            expect(weightInput()).toHaveAttribute("aria-invalid", "true");
            expect(onSubmit).not.toHaveBeenCalled();
            expect(onClose).not.toHaveBeenCalled();
        },
    );

    it("[QA] Deve bloquear o peso vazio, sem tratá-lo como 0", async () => {
        const { user, onSubmit } = renderModal();

        await user.type(nameInput(), "Pesquisa");
        setWeight("");
        await user.click(submitButton());

        // Number("") vale 0 em JavaScript: um campo apagado não pode virar peso 0 em silêncio
        expect(screen.getByRole("alert")).toHaveTextContent(WEIGHT_INVALID_MESSAGE);
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it("Deve limpar o alerta do peso assim que o valor é alterado", async () => {
        const { user } = renderModal();

        await user.type(nameInput(), "Pesquisa");
        setWeight("101");
        await user.click(submitButton());
        expect(screen.getByRole("alert")).toBeInTheDocument();
        setWeight("50");

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    // --- FECHAR ---

    it("Deve fechar com Esc", async () => {
        const { user, onClose } = renderModal();

        await user.keyboard("{Escape}");

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("Deve fechar ao clicar no fundo e não ao clicar dentro do formulário", async () => {
        const { user, onClose } = renderModal();

        // stopPropagation do form: um clique no título não pode descartar o que o tutor digitou
        await user.click(screen.getByRole("heading", { name: "Adicionar Critério" }));
        expect(onClose).not.toHaveBeenCalled();

        await user.click(screen.getByRole("dialog"));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("Deve fechar pelos botões Cancelar e Fechar sem enviar nada", async () => {
        const { user, onClose, onSubmit } = renderModal();

        await user.click(screen.getByRole("button", { name: "Cancelar" }));
        await user.click(screen.getByRole("button", { name: "Fechar modal" }));

        expect(onClose).toHaveBeenCalledTimes(2);
        expect(onSubmit).not.toHaveBeenCalled();
    });
});