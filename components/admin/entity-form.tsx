"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/(admin)/admin/actions";

export type FieldConfig = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "date" | "number" | "url";
  required?: boolean;
  help?: string;
  rows?: number;
};

type EntityFormProps = Readonly<{
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  fields: FieldConfig[];
  initialValues: Record<string, string>;
  submitLabel: string;
}>;

const inputClass =
  "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-600 aria-[invalid=true]:border-rose-600";

export function EntityForm({ action, fields, initialValues, submitLabel }: EntityFormProps) {
  const [state, formAction, pending] = useActionState(action, {
    fieldErrors: {},
    values: initialValues,
  });

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {initialValues.id ? <input type="hidden" name="id" value={initialValues.id} /> : null}
      {state.message ? (
        <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {state.message}
        </p>
      ) : null}
      {fields.map((field) => {
        const errors = state.fieldErrors[field.name];
        const describedBy = [
          field.help ? `${field.name}-help` : null,
          errors ? `${field.name}-error` : null,
        ]
          .filter(Boolean)
          .join(" ");
        const shared = {
          id: field.name,
          name: field.name,
          defaultValue: state.values[field.name] ?? "",
          required: field.required,
          "aria-invalid": errors ? true : undefined,
          "aria-describedby": describedBy || undefined,
          className: inputClass,
        };

        return (
          <div key={field.name}>
            <label htmlFor={field.name} className="text-sm font-semibold text-slate-900">
              {field.label}
              {field.required ? <span aria-hidden="true"> *</span> : null}
            </label>
            {field.type === "textarea" ? (
              <textarea rows={field.rows ?? 4} {...shared} />
            ) : (
              <input type={field.type ?? "text"} {...shared} />
            )}
            {field.help ? (
              <p id={`${field.name}-help`} className="mt-1 text-xs text-slate-500">
                {field.help}
              </p>
            ) : null}
            {errors ? (
              <p id={`${field.name}-error`} className="mt-1 text-sm text-rose-700">
                {errors.join(" ")}
              </p>
            ) : null}
          </div>
        );
      })}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
