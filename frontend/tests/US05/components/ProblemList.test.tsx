import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProblemList } from "@/components/features/problems/ProblemList";
import { makeOtherProblem, makeProblem } from "../fixtures";

function renderList(problems = [makeProblem(), makeOtherProblem()]) {
  const callbacks = {
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };
  const user = userEvent.setup();

  render(<ProblemList problems={problems} {...callbacks} />);

  return { problems, user, ...callbacks };
}

describe("[US05] ProblemList", () => {
  it("should render the problems as an ordered list in the received order", () => {
    const { problems } = renderList([
      makeProblem(),
      makeOtherProblem(),
      makeProblem({ id: "777e7777-e77b-77d7-a777-777777777777", title: "Problem 3" }),
    ]);

    // Uma lista ordenada deixa explícita a cronologia do semestre
    const list = screen.getByRole("list");
    expect(list.tagName).toBe("OL");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(problems.length);
    problems.forEach((problem, index) => {
      expect(within(items[index]).getByText(problem.title)).toBeInTheDocument();
    });
  });

  it("should pass the clicked problem to each action", async () => {
    const { problems, user, onEdit, onDelete } = renderList();
    const secondItem = within(screen.getAllByRole("listitem")[1]);

    await user.click(secondItem.getByRole("button", { name: /editar/i }));
    await user.click(secondItem.getByRole("button", { name: /excluir/i }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(problems[1]);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(problems[1]);
  });
});
