import type { Experience } from "@/lib/db/schema";
import { formatDateRange } from "@/components/public/format-date";

type ExperienceTimelineProps = Readonly<{ items: Experience[] }>;

export function ExperienceTimeline({ items }: ExperienceTimelineProps) {
  return (
    <ol className="space-y-8 border-l border-slate-200 pl-6">
      {items.map((item) => (
        <li key={item.id}>
          <article className="space-y-2">
            <header>
              <h3 className="text-lg font-semibold text-slate-950">
                {item.title} <span className="font-normal text-slate-600">· {item.employer}</span>
              </h3>
              <p className="text-sm text-slate-500">
                {formatDateRange(item.startDate, item.endDate)}
              </p>
            </header>
            <p className="leading-7 text-slate-700">{item.description}</p>
            {item.highlights.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 leading-7 text-slate-700">
                {item.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            ) : null}
          </article>
        </li>
      ))}
    </ol>
  );
}
