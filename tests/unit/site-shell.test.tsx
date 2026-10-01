import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import Home from "@/app/page";

it("renders a recruiter-oriented resume call to action", () => {
  render(<Home />);

  expect(screen.getByRole("link", { name: /view resume/i })).toBeVisible();
});
