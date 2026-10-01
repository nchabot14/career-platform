import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ContactForm } from "@/components/public/contact-form";

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

function fill() {
  fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Grace" } });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "bad" } });
  fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: "Hi" } });
  fireEvent.change(screen.getByLabelText(/message/i), { target: { value: "Hello" } });
}

async function submit() {
  await act(async () => {
    fireEvent.submit(screen.getByRole("button", { name: /send/i }).closest("form")!);
  });
}

it("shows server field errors next to the right field and keeps typed values", async () => {
  vi.stubGlobal("fetch", vi.fn(async () =>
    Response.json({ fieldErrors: { email: ["Enter a valid email address."] } }, { status: 422 }),
  ));
  render(<ContactForm />);
  fill();

  await submit();

  expect(await screen.findByText("Enter a valid email address.")).toBeVisible();
  expect(screen.getByLabelText(/email/i)).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByLabelText(/name/i)).toHaveValue("Grace");
});

it("announces success and clears the form", async () => {
  vi.stubGlobal("fetch", vi.fn(async () =>
    Response.json({ id: "m1", notificationStatus: "sent", message: "Thanks — your message was sent." }, { status: 201 }),
  ));
  render(<ContactForm />);
  fill();

  await submit();

  expect(await screen.findByRole("status")).toHaveTextContent("Thanks — your message was sent.");
  expect(screen.getByLabelText(/name/i)).toHaveValue("");
});

it("explains rate limiting", async () => {
  vi.stubGlobal("fetch", vi.fn(async () =>
    Response.json({ error: "Too many messages from your network. Please try again in an hour." }, { status: 429 }),
  ));
  render(<ContactForm />);
  fill();

  await submit();

  expect(await screen.findByRole("alert")).toHaveTextContent(/too many messages/i);
});
