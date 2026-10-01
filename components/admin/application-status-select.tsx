import { changeApplicationStatusAction } from "@/app/(admin)/admin/actions";
import { statusOptions } from "@/components/admin/application-form";
import type { ApplicationStatus } from "@/lib/db/schema";

type ApplicationStatusSelectProps = Readonly<{ id: string; status: ApplicationStatus }>;

export function ApplicationStatusSelect({ id, status }: ApplicationStatusSelectProps) {
  return (
    <form action={changeApplicationStatusAction.bind(null, id)} className="flex items-end gap-2">
      <div>
        <label htmlFor="status-change" className="block text-sm font-semibold text-slate-900">
          Status
        </label>
        <select
          id="status-change"
          name="status"
          defaultValue={status}
          className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
        Update status
      </button>
    </form>
  );
}
