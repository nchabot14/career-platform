"use client";

import { useActionState } from "react";
import { uploadResumeAction, type UploadState } from "@/app/(admin)/admin/actions";

export function ResumeUploadForm() {
  const [state, formAction, pending] = useActionState<UploadState, FormData>(uploadResumeAction, {});

  return (
    <form action={formAction} className="space-y-3">
      <label htmlFor="resume" className="block text-sm font-semibold text-slate-900">
        Resume PDF (10 MiB maximum)
      </label>
      <input
        id="resume"
        name="resume"
        type="file"
        accept="application/pdf"
        required
        aria-describedby={state.error ? "resume-error" : undefined}
        className="block text-sm"
      />
      {state.error ? (
        <p id="resume-error" role="alert" className="text-sm text-rose-700">
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
        className="rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "Uploading…" : "Upload and publish"}
      </button>
    </form>
  );
}
