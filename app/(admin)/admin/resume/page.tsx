import { ResumeUploadForm } from "@/components/admin/resume-upload-form";
import { listResumeDocuments } from "@/lib/db/repositories/resumes";

export const dynamic = "force-dynamic";

export default async function AdminResumePage() {
  const resumes = await listResumeDocuments();
  const current = resumes.find((resume) => resume.isCurrent);

  return (
    <section aria-labelledby="resume-heading" className="max-w-2xl space-y-6">
      <h2 id="resume-heading" className="text-2xl font-semibold text-slate-950">
        Resume PDF
      </h2>
      <p className="text-slate-700">
        {current ? (
          <>
            Current resume: <strong>{current.filename}</strong> ({Math.ceil(current.size / 1024)} KB).{" "}
            <a href="/resume" className="text-sky-700 underline underline-offset-4">
              Download the public copy
            </a>
          </>
        ) : (
          "No resume uploaded yet. The public page hides the Resume PDF link until you upload one."
        )}
      </p>
      <ResumeUploadForm />
      {resumes.length > 1 ? (
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-slate-800">
            Previous uploads ({resumes.length - 1})
          </summary>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {resumes
              .filter((resume) => !resume.isCurrent)
              .map((resume) => (
                <li key={resume.id}>
                  {resume.filename} · {resume.createdAt.toISOString().slice(0, 10)}
                </li>
              ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
