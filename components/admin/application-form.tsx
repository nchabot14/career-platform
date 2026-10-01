import type { FieldConfig } from "@/components/admin/entity-form";
import { applicationStatuses, type JobApplication } from "@/lib/db/schema";

export const statusLabels: Record<(typeof applicationStatuses)[number], string> = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const statusOptions = applicationStatuses.map((value) => ({ value, label: statusLabels[value] }));

export const applicationFields: FieldConfig[] = [
  { name: "company", label: "Company", required: true },
  { name: "role", label: "Role", required: true },
  { name: "status", label: "Status", type: "select", options: statusOptions },
  { name: "source", label: "Source", help: "Where you found it: referral, LinkedIn, career fair…" },
  { name: "jobUrl", label: "Job posting URL", type: "url" },
  { name: "appliedAt", label: "Applied date", type: "date" },
  { name: "nextFollowUpAt", label: "Next follow-up", type: "date" },
  { name: "notes", label: "Notes", type: "textarea", rows: 5 },
];

export const contactFields: FieldConfig[] = [
  { name: "name", label: "Name", required: true },
  { name: "role", label: "Their role" },
  { name: "email", label: "Email", type: "email" },
  { name: "phone", label: "Phone" },
  { name: "profileUrl", label: "Profile URL", type: "url" },
  { name: "notes", label: "Notes", type: "textarea", rows: 3 },
];

const day = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : "");

export function applicationFormValues(application: JobApplication): Record<string, string> {
  return {
    company: application.company,
    role: application.role,
    status: application.status,
    source: application.source ?? "",
    jobUrl: application.jobUrl ?? "",
    appliedAt: day(application.appliedAt),
    nextFollowUpAt: day(application.nextFollowUpAt),
    notes: application.notes ?? "",
  };
}
