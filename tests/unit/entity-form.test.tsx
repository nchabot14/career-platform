import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("@/app/(admin)/admin/actions", () => ({}));

import { EntityForm } from "@/components/admin/entity-form";

afterEach(() => {
  document.body.innerHTML = "";
});

it("shows field-specific errors and keeps the submitted values", async () => {
  const action = vi.fn(async (_state: unknown, formData: FormData) => ({
    fieldErrors: { title: ["Title is required."] },
    values: { title: String(formData.get("title")), slug: String(formData.get("slug")) },
    message: "Fix the highlighted fields and save again.",
  }));

  render(
    <EntityForm
      action={action}
      fields={[
        { name: "title", label: "Title", required: true },
        { name: "slug", label: "Slug", required: true },
      ]}
      initialValues={{}}
      submitLabel="Add"
    />,
  );

  fireEvent.change(screen.getByLabelText(/slug/i), { target: { value: "kept-slug" } });
  await act(async () => {
    fireEvent.submit(screen.getByRole("button", { name: "Add" }).closest("form")!);
  });

  expect(action).toHaveBeenCalledTimes(1);
  expect(await screen.findByText("Title is required.")).toBeVisible();
  expect(screen.getByLabelText(/title/i)).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByLabelText(/title/i)).toHaveAccessibleDescription("Title is required.");
  expect(screen.getByLabelText(/slug/i)).toHaveValue("kept-slug");
  expect(screen.getByRole("alert")).toHaveTextContent(/fix the highlighted fields/i);
});
