import type { Education } from "@/lib/db/schema";
import { formatDateRange } from "@/components/public/format-date";

type EducationListProps = Readonly<{ items: Education[] }>;

export function EducationList({ items }: EducationListProps) {
  return (
    <ul className="space-y-5">
      {items.map((item) => {
        const dates = formatDateRange(item.startDate, item.endDate);

        return (
          <li key={item.id}>
            <h3 className="text-lg font-semibold text-slate-950">{item.institution}</h3>
            <p className="text-slate-700">
              {item.credential}
              {item.fieldOfStudy ? ` · ${item.fieldOfStudy}` : null}
            </p>
            {dates ? <p className="text-sm text-slate-500">{dates}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}
