"use client";

import { useActionState } from "react";
import type { UploadState } from "@/app/(admin)/admin/actions";

type DocumentUploadFormProps = Readonly<{
  action: (state: UploadState, formData: FormData) => Promise<UploadState>;
}>;

export function DocumentUploadForm({ action }: DocumentUploadFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label htmlFor="document" className="block text-sm font-semibold text-slate-900">
          Document (PDF, DOCX, or TXT; 10 MiB maximum)
        </label>
        <input
          id="document"
          name="document"
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          required
          aria-describedby={state.error ? "document-error" : undefined}
          className="mt-1 block text-sm"
        />
      </div>
      <div>
        <label htmlFor="category" className="block text-sm font-semibold text-slate-900">
          Category
        </label>
        <input
          id="category"
          name="category"
          defaultValue="Resume"
          className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
        />
      </div>
      {state.error ? (
        <p id="document-error" role="alert" className="text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p role="status" className="text-sm text-emerald-700">
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "Uploading…" : "Upload document"}
      </button>
    </form>
  );
}
