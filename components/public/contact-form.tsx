"use client";

import { useState } from "react";

type Field = "name" | "email" | "subject" | "message";
type FieldErrors = Partial<Record<Field, string[]>>;

const fields: { name: Field; label: string; type?: string; autoComplete?: string }[] = [
  { name: "name", label: "Name", autoComplete: "name" },
  { name: "email", label: "Email", type: "email", autoComplete: "email" },
  { name: "subject", label: "Subject" },
  { name: "message", label: "Message" },
];

const inputClass =
  "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-600 aria-[invalid=true]:border-rose-600";

export function ContactForm() {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form));

    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        setFieldErrors({});
        setSuccess(result.message ?? "Thanks — your message was sent.");
        form.reset();
      } else {
        setFieldErrors(result.fieldErrors ?? {});
        setError(result.error ?? "Your message couldn't be sent. Please try again.");
      }
    } catch {
      setError("Your message couldn't be sent. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4" noValidate>
      {fields.map((field) => {
        const errors = fieldErrors[field.name];
        const shared = {
          id: `contact-${field.name}`,
          name: field.name,
          required: true,
          autoComplete: field.autoComplete,
          "aria-invalid": errors ? true : undefined,
          "aria-describedby": errors ? `contact-${field.name}-error` : undefined,
          className: inputClass,
        };

        return (
          <div key={field.name}>
            <label htmlFor={`contact-${field.name}`} className="text-sm font-semibold text-slate-900">
              {field.label}
            </label>
            {field.name === "message" ? (
              <textarea rows={5} {...shared} />
            ) : (
              <input type={field.type ?? "text"} {...shared} />
            )}
            {errors ? (
              <p id={`contact-${field.name}-error`} className="mt-1 text-sm text-rose-700">
                {errors.join(" ")}
              </p>
            ) : null}
          </div>
        );
      })}
      {error ? (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p role="status" className="text-sm text-emerald-700">
          {success}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
