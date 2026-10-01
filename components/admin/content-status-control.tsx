import {
  deleteContentAction,
  setPublicationAction,
} from "@/app/(admin)/admin/actions";
import type { ContentKind } from "@/lib/services/content-management";
import type { PublicationState } from "@/lib/db/schema";

type ContentStatusControlProps = Readonly<{
  kind: ContentKind;
  id: string;
  label: string;
  publicationState: PublicationState;
  allowDelete?: boolean;
}>;

const buttonClass =
  "rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-900 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600";

export function ContentStatusControl({
  kind,
  id,
  label,
  publicationState,
  allowDelete = true,
}: ContentStatusControlProps) {
  const published = publicationState === "published";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
          published ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
        }`}
      >
        {published ? "Published" : "Draft"}
      </span>
      <form action={setPublicationAction.bind(null, kind, id, published ? "draft" : "published")}>
        <button type="submit" className={buttonClass} aria-label={`${published ? "Unpublish" : "Publish"} ${label}`}>
          {published ? "Unpublish" : "Publish"}
        </button>
      </form>
      {allowDelete ? (
        <details className="text-xs">
          <summary className="cursor-pointer font-semibold text-rose-700">Delete…</summary>
          <form action={deleteContentAction.bind(null, kind, id)} className="mt-2 flex items-center gap-2">
            <label className="flex items-center gap-1">
              <input type="checkbox" name="confirm" value="yes" required />
              Permanently delete {label}
            </label>
            <button type="submit" className="rounded-full bg-rose-700 px-3 py-1 font-semibold text-white">
              Delete
            </button>
          </form>
        </details>
      ) : null}
    </div>
  );
}
