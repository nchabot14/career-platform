import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import ErrorPage from "@/app/error";

afterEach(cleanup);

it("shows a generic message, never the error's own text", () => {
  render(
    <ErrorPage
      error={new Error('relation "profile" does not exist at postgres://db.internal')}
      reset={() => {}}
    />,
  );

  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Something went wrong");
  expect(screen.queryByText(/relation|postgres/)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
});
