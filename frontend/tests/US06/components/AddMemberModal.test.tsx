import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddMemberModal } from "@/components/features/groups/AddMemberModal";
import { ADD_MEMBER_ERROR_MESSAGE, makeOtherStudent, makeStudent, OTHER_STUDENT_ID } from "../fixtures";

function renderModal() {
  const students = [makeStudent(), makeOtherStudent()];
  const onSubmit = vi.fn<(studentId: string) => Promise<void>>().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const user = userEvent.setup();

  render(<AddMemberModal students={students} onSubmit={onSubmit} onClose={onClose} />);

  return {
    students,
    user,
    onSubmit,
    onClose,
    addButton: screen.getByRole("button", { name: /^adicionar$/i }),
  };
}

describe("[US06] AddMemberModal", () => {
  it("should offer exactly the available students it receives", () => {
    const { students } = renderModal();

    const options = screen.getAllByRole("radio");
    expect(options).toHaveLength(students.length);
    students.forEach((student) => {
      expect(screen.getByRole("radio", { name: student.name })).toBeInTheDocument();
    });
  });

  it("should submit the chosen student id and close", async () => {
    const { user, onSubmit, onClose, addButton } = renderModal();

    await user.click(screen.getByRole("radio", { name: makeOtherStudent().name }));
    await user.click(addButton);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(OTHER_STUDENT_ID);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("[QA] should show an alert and stay open when the addition is refused", async () => {
    const { user, onSubmit, onClose, addButton } = renderModal();
    onSubmit.mockRejectedValue(new Error("Student is not enrolled in this room."));

    await user.click(screen.getByRole("radio", { name: makeOtherStudent().name }));
    await user.click(addButton);

    expect(await screen.findByRole("alert")).toHaveTextContent(ADD_MEMBER_ERROR_MESSAGE);
    expect(onClose).not.toHaveBeenCalled();
  });
});
