import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Avatar } from "@/components/ui/Avatar";
import { STUDENT_INITIALS, STUDENT_PHOTO_URL } from "../fixtures";

// Com alt="" a foto não tem papel acessível; o que o critério exige é a ausência do próprio <img>
function photo(container: HTMLElement) {
  return container.querySelector("img");
}

// Sem valor padrão: undefined precisa chegar ao componente para representar o aluno sem foto
function renderAvatar(src: string | undefined) {
  const { container } = render(<Avatar src={src} alt="" initials={STUDENT_INITIALS} lazy />);
  return { container };
}

describe("[US18] Avatar", () => {
  it("Deve carregar a foto com loading=\"lazy\" e sem as iniciais quando o link é válido", () => {
    const { container } = renderAvatar(STUDENT_PHOTO_URL);

    const img = photo(container);
    expect(img).toHaveAttribute("src", STUDENT_PHOTO_URL);
    // O navegador só baixa a imagem quando ela se aproxima da área visível da tela
    expect(img).toHaveAttribute("loading", "lazy");
    expect(screen.queryByText(STUDENT_INITIALS)).not.toBeInTheDocument();
  });

  it("[QA] Deve trocar a imagem quebrada pelas iniciais, retirando o <img> da tela", () => {
    const { container } = renderAvatar("https://img.uefs.br/link-quebrado.png");

    // userEvent não simula falha de rede; o evento error é o que o navegador dispara no link quebrado
    fireEvent.error(photo(container)!);

    // Sem o <img> no DOM, o navegador não tem onde desenhar o ícone nativo de imagem quebrada
    expect(photo(container)).toBeNull();
    expect(screen.getByText(STUDENT_INITIALS)).toBeInTheDocument();
  });

  it("Deve exibir as iniciais, sem <img>, quando o aluno não tem foto", () => {
    const { container } = renderAvatar(undefined);

    expect(photo(container)).toBeNull();
    expect(screen.getByText(STUDENT_INITIALS)).toBeInTheDocument();
  });
});
