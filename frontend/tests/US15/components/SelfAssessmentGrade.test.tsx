import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SelfAssessmentGrade } from "@/components/features/grade-adjustment/SelfAssessmentGrade";
import { ADJUSTED_GRADE, MODIFIED_BY_TUTOR_ICON, ORIGINAL_GRADE } from "../fixtures";

describe("[US15] SelfAssessmentGrade", () => {
  it("Deve exibir a nota ajustada com o ícone \"Nota Modificada pelo Tutor\" quando o tutor alterou a nota", () => {
    render(<SelfAssessmentGrade score={ADJUSTED_GRADE} modifiedByTutor />);

    expect(screen.getByText(/8,5/)).toBeInTheDocument();
    // O ícone precisa ter nome acessível: só a cor ou o desenho não informam o aluno
    expect(screen.getByRole("img", { name: MODIFIED_BY_TUTOR_ICON })).toBeInTheDocument();
  });

  it("Deve exibir a nota sem o ícone quando o tutor não alterou a nota", () => {
    render(<SelfAssessmentGrade score={ORIGINAL_GRADE} modifiedByTutor={false} />);

    expect(screen.getByText(/6,0/)).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: MODIFIED_BY_TUTOR_ICON })).not.toBeInTheDocument();
    expect(screen.queryByText(MODIFIED_BY_TUTOR_ICON)).not.toBeInTheDocument();
  });
});
