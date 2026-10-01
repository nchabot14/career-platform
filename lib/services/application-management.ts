import { z } from "zod";
import {
  appendApplicationActivity,
  createApplication as insertApplication,
  getApplicationRow,
  insertApplicationContact,
  transitionApplicationStatus,
  updateApplicationRow,
} from "@/lib/db/repositories/job-applications";
import { applicationStatuses, type ApplicationStatus } from "@/lib/db/schema";
import { storeApplicationDocument } from "@/lib/storage/application-documents";
import type { UploadedFile } from "@/lib/storage/uploaded-file";

export { ApplicationDocumentError } from "@/lib/storage/application-documents";

export type FieldErrors = Partial<Record<string, string[]>>;
export type SaveResult = { ok: true; id: string } | { ok: false; fieldErrors: FieldErrors };

const requiredText = (label: string) =>
  z.string({ error: `${label} is required.` }).trim().min(1, `${label} is required.`);

const optionalText = z
  .string()
  .optional()
  .transform((value) => value?.trim() || null);

function isRealDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

// Dates are entered as YYYY-MM-DD and stored as that day's UTC midnight.
const optionalDate = (label: string) =>
  optionalText
    .refine((value) => value === null || isRealDate(value), `${label} must be a date in YYYY-MM-DD format.`)
    .transform((value) => (value ? new Date(`${value}T00:00:00Z`) : null));

const optionalUrl = (label: string) =>
  optionalText.refine((value) => {
    if (value === null) return true;
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, `${label} must be a full http(s) URL.`);

const statusSchema = z.enum(applicationStatuses, { error: "Choose a valid status." });

export const applicationSchema = z.object({
  company: requiredText("Company"),
  role: requiredText("Role"),
  source: optionalText,
  jobUrl: optionalUrl("Job URL"),
  status: statusSchema,
  appliedAt: optionalDate("Applied date"),
  notes: optionalText,
  nextFollowUpAt: optionalDate("Follow-up date"),
});

export type ApplicationDraft = z.input<typeof applicationSchema>;

const contactSchema = z.object({
  name: requiredText("Name"),
  role: optionalText,
  email: optionalText.refine(
    (value) => value === null || z.email().safeParse(value).success,
    "Enter a valid email address.",
  ),
  phone: optionalText,
  profileUrl: optionalUrl("Profile URL"),
  notes: optionalText,
});

export async function createApplication(input: ApplicationDraft | unknown): Promise<SaveResult> {
  const parsed = applicationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const application = await insertApplication(parsed.data);
  await appendApplicationActivity({
    applicationId: application.id,
    type: "created",
    occurredAt: new Date(),
    note: null,
    priorStatus: null,
    resultingStatus: application.status,
  });

  return { ok: true, id: application.id };
}

export async function updateApplication(id: string, input: ApplicationDraft | unknown): Promise<SaveResult> {
  const parsed = applicationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const current = await getApplicationRow(id);
  if (!current) throw new Error(`Job application ${id} was not found.`);

  const { status, ...values } = parsed.data;
  await updateApplicationRow(id, values);

  // Status changes always go through the transaction that records the timeline.
  if (status !== current.status) await transitionApplicationStatus(id, status);

  return { ok: true, id };
}

export async function changeApplicationStatus(id: string, status: ApplicationStatus) {
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) throw new Error(`Invalid application status: ${String(status)}`);

  return transitionApplicationStatus(id, parsed.data);
}

export async function addApplicationContact(applicationId: string, input: unknown): Promise<SaveResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const contact = await insertApplicationContact({ applicationId, ...parsed.data });
  return { ok: true, id: contact.id };
}

export async function addApplicationDocument(applicationId: string, file: UploadedFile, category = "Other") {
  const application = await getApplicationRow(applicationId);
  if (!application) throw new Error(`Job application ${applicationId} was not found.`);

  return storeApplicationDocument(applicationId, file, category.trim() || "Other");
}
