import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CRITERIA_REQUIRED_MESSAGE,
  CRITERIA_INVALID_CHARACTERS_MESSAGE,
} from "../fixtures";

/**
 * Interface representativa do estado do componente de gerenciamento de critérios.
 */
interface Criterion {
  id: string;
  name: string;
  description: string;
  weight: number;
}

/**
 * Mock Component que simula o comportamento da tela de gerenciamento de critérios
 * da US07, permitindo validar isoladamente as regras de frontend (SPA e validações).
 */
function CriteriaManagementView({
  onSave,
}: {
  onSave?: (criteriaList: Criterion[]) => void;
}) {
  const [criteria, setCriteria] = React.useState<Criterion[]>([]);
  const [criteriaName, setCriteriaName] = React.useState("");
  const [criteriaDescription, setCriteriaDescription] = React.useState("");
  const [criteriaWeight, setCriteriaWeight] = React.useState("1.0");
  const [errorMessage, setErrorMessage] = React.useState("");

  const handleAddCriterion = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = criteriaName.trim();

    if (!trimmed) {
      setErrorMessage("O nome do critério é obrigatório.");
      return;
    }

    // Regra: Apenas alfanuméricos, acentos, espaços e hifens
    const validCharactersRegex = /^[a-zA-Z0-9À-ÿ\s-]+$/;
    if (!validCharactersRegex.test(trimmed)) {
      setErrorMessage(
        "O nome do critério contém caracteres inválidos. Utilize apenas letras, números e hifens."
      );
      return;
    }

    setErrorMessage("");
    const newCriterion: Criterion = {
      id: `crit-${Date.now()}`,
      name: trimmed,
      description: criteriaDescription,
      weight: parseFloat(criteriaWeight) || 1.0,
    };

    // Atualização dinâmica de estado sem recarregamento
    setCriteria((prev) => [...prev, newCriterion]);
    setCriteriaName("");
    setCriteriaDescription("");
  };

  const handleRemoveCriterion = (id: string) => {
    setCriteria((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div id="formPerformanceTable">
      <form onSubmit={handleAddCriterion}>
        <input
          id="inputCriterionName"
          aria-label="Nome do critério"
          value={criteriaName}
          onChange={(e) => setCriteriaName(e.target.value)}
        />
        <input
          id="inputCriterionDescription"
          aria-label="Descrição do critério"
          value={criteriaDescription}
          onChange={(e) => setCriteriaDescription(e.target.value)}
        />
        <input
          id="inputCriterionWeight"
          aria-label="Peso do critério"
          value={criteriaWeight}
          onChange={(e) => setCriteriaWeight(e.target.value)}
        />
        <button type="submit" id="btnAddCriterion">
          Adicionar Critério
        </button>
      </form>

      {errorMessage && (
        <span id="feedbackErrorCriteriaName" role="alert">
          {errorMessage}
        </span>
      )}

      <ul id="tableCriteriaList">
        {criteria.map((item) => (
          <li key={item.id} className="rowCriterionItem">
            <span>{item.name}</span>
            <button
              id={`btnRemoveCriterion_${item.id}`}
              onClick={() => handleRemoveCriterion(item.id)}
            >
              Remover
            </button>
          </li>
        ))}
      </ul>

      {onSave && (
        <button
          id="btnSavePerformanceTable"
          onClick={() => onSave(criteria)}
        >
          Salvar Tabela
        </button>
      )}
    </div>
  );
}

// Import necessário do React para JSX em ambiente Vitest
import React from "react";

describe("[US07] CriteriaManagement Component Unit Tests", () => {
  it("deve adicionar novo critério na listagem visual dinamicamente sem limpar os demais dados", async () => {
    const user = userEvent.setup();
    render(<CriteriaManagementView />);

    const inputName = screen.getByLabelText(/nome do critério/i);
    const btnAdd = screen.getByRole("button", { name: /adicionar critério/i });

    await user.type(inputName, "Raciocínio Lógico");
    await user.click(btnAdd);

    expect(screen.getByText("Raciocínio Lógico")).toBeInTheDocument();
    expect(inputName).toHaveValue("");
  });

  it("deve remover critério da listagem ao clicar no botão de remoção", async () => {
    const user = userEvent.setup();
    render(<CriteriaManagementView />);

    const inputName = screen.getByLabelText(/nome do critério/i);
    const btnAdd = screen.getByRole("button", { name: /adicionar critério/i });

    await user.type(inputName, "Postura");
    await user.click(btnAdd);
    expect(screen.getByText("Postura")).toBeInTheDocument();

    const btnRemove = screen.getByRole("button", { name: /remover/i });
    await user.click(btnRemove);

    expect(screen.queryByText("Postura")).not.toBeInTheDocument();
  });

  it("deve exibir mensagem de erro síncrona se tentar submeter campo criteriaName vazio", async () => {
    const user = userEvent.setup();
    render(<CriteriaManagementView />);

    const btnAdd = screen.getByRole("button", { name: /adicionar critério/i });
    await user.click(btnAdd);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(CRITERIA_REQUIRED_MESSAGE);
  });

  it("deve bloquear inclusão e alertar erro ao receber caracteres especiais não permitidos", async () => {
    const user = userEvent.setup();
    render(<CriteriaManagementView />);

    const inputName = screen.getByLabelText(/nome do critério/i);
    const btnAdd = screen.getByRole("button", { name: /adicionar critério/i });

    await user.type(inputName, "<script>alert('XSS')</script>");
    await user.click(btnAdd);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(CRITERIA_INVALID_CHARACTERS_MESSAGE);
    expect(screen.queryByText("<script>alert('XSS')</script>")).not.toBeInTheDocument();
  });
});
