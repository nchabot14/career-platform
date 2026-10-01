import { statusLabels } from "@/components/admin/application-form";
import type { ApplicationActivity } from "@/lib/db/schema";

type ApplicationTimelineProps = Readonly<{ activities: ApplicationActivity[] }>;

function describe(activity: ApplicationActivity) {
  if (activity.type === "created") {
    return `Added as ${activity.resultingStatus ? statusLabels[activity.resultingStatus] : "new"}`;
  }
  if (activity.type === "status_transition" && activity.priorStatus && activity.resultingStatus) {
    return `${statusLabels[activity.priorStatus]} → ${statusLabels[activity.resultingStatus]}`;
  }
  return activity.note ?? activity.type;
}

export function ApplicationTimeline({ activities }: ApplicationTimelineProps) {
  if (activities.length === 0) return <p className="text-sm text-slate-600">No activity yet.</p>;

  return (
    <ol className="space-y-3 border-l border-slate-200 pl-5">
      {activities.map((activity) => (
        <li key={activity.id}>
          <p className="text-sm font-medium text-slate-900">{describe(activity)}</p>
          <p className="text-xs text-slate-500">
            <time dateTime={activity.occurredAt.toISOString()}>
              {activity.occurredAt.toISOString().replace("T", " ").slice(0, 16)} UTC
            </time>
          </p>
        </li>
      ))}
    </ol>
  );
}
