import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Toast } from "@/components/ui/Toast";

describe("[US03] Toast", () => {
  it("[QA] should display the success message", () => {
    render(<Toast message="Link copiado!" type="success" onClose={vi.fn()} />);

    expect(screen.getByText("Link copiado!")).toBeVisible();
  });
});
