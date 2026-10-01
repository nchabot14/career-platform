import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  deleteContentRow,
  getProfileRow,
  insertContent,
  setContentPublicationState,
  updateContent,
  type ContentKind,
} from "@/lib/db/repositories/content";

export type { ContentKind } from "@/lib/db/repositories/content";

export type FieldErrors = Partial<Record<string, string[]>>;

export type SaveResult = { ok: true; id: string } | { ok: false; fieldErrors: FieldErrors };

// Form fields arrive as strings; blank optional fields become null.
const requiredText = (label: string) =>
  z.string({ error: `${label} is required.` }).trim().min(1, `${label} is required.`);

const optionalText = z
  .string()
  .optional()
  .transform((value) => value?.trim() || null);

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

const requiredDate = (label: string) =>
  requiredText(label).refine(
    (value) => isoDatePattern.test(value) && isRealDate(value),
    `${label} must be a date in YYYY-MM-DD format.`,
  );

const optionalDate = (label: string) =>
  optionalText.refine(
    (value) => value === null || (isoDatePattern.test(value) && isRealDate(value)),
    `${label} must be a date in YYYY-MM-DD format.`,
  );

const sortOrder = z
  .string()
  .optional()
  .transform((value) => value?.trim() || "0")
  .refine((value) => /^\d{1,4}$/.test(value), "Order must be a whole number from 0 to 9999.")
  .transform(Number);

const lines = z
  .string()
  .optional()
  .transform((value) =>
    (value ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  );

function isUrl(value: string, protocols: string[]) {
  try {
    return protocols.includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

const projectLinks = z
  .string()
  .optional()
  .transform((value, ctx) => {
    const links = [];

    for (const line of (value ?? "").split("\n").map((entry) => entry.trim())) {
      if (!line) continue;
      const [label, href, ...rest] = line.split("|").map((part) => part.trim());

      if (!label || !href || rest.length > 0 || !isUrl(href, ["http:", "https:"])) {
        ctx.addIssue({
          code: "custom",
          message: `Each link needs a label and an http(s) URL, written as "Label | https://example.com". Check: ${line}`,
        });
        return z.NEVER;
      }

      links.push({ label, href });
    }

    return links;
  });

const optionalImageUrl = optionalText.refine(
  (value) => value === null || value.startsWith("/") || isUrl(value, ["http:", "https:"]),
  "Cover image must be an http(s) URL or a path starting with /.",
);

const endNotBeforeStart = (
  data: { startDate: string | null; endDate: string | null },
  ctx: z.RefinementCtx,
) => {
  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date can't be before the start date." });
  }
};

const id = z.string().trim().optional().transform((value) => value || undefined);

export const profileSchema = z.object({
  id,
  name: requiredText("Name"),
  headline: requiredText("Headline"),
  summary: requiredText("Summary"),
  location: optionalText,
  availability: optionalText,
});

export const experienceSchema = z
  .object({
    id,
    employer: requiredText("Employer"),
    title: requiredText("Title"),
    startDate: requiredDate("Start date"),
    endDate: optionalDate("End date"),
    description: requiredText("Description"),
    highlights: lines,
    sortOrder,
  })
  .superRefine(endNotBeforeStart);

export const educationSchema = z
  .object({
    id,
    institution: requiredText("Institution"),
    credential: requiredText("Credential"),
    fieldOfStudy: optionalText,
    startDate: optionalDate("Start date"),
    endDate: optionalDate("End date"),
    sortOrder,
  })
  .superRefine(endNotBeforeStart);

export const skillSchema = z.object({
  id,
  name: requiredText("Name"),
  category: requiredText("Category"),
  proficiencyOrContext: optionalText,
  certificationDetails: optionalText,
  sortOrder,
});

export const socialLinkSchema = z.object({
  id,
  label: requiredText("Label"),
  url: requiredText("URL").refine(
    (value) => isUrl(value, ["http:", "https:", "mailto:"]),
    "URL must be a full http(s) or mailto: address.",
  ),
  icon: optionalText,
  sortOrder,
});

export const projectSchema = z.object({
  id,
  title: requiredText("Title"),
  slug: requiredText("Slug").regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must be lowercase letters and numbers joined by single hyphens.",
  ),
  summary: requiredText("Summary"),
  body: requiredText("Body"),
  role: optionalText,
  technologies: lines,
  links: projectLinks,
  coverImage: optionalImageUrl,
  sortOrder,
});

export type ProjectDraft = z.input<typeof projectSchema>;

function isUniqueViolation(error: unknown): boolean {
  for (let current = error; current; current = (current as { cause?: unknown }).cause) {
    if (String((current as Error).message ?? "").includes("UNIQUE constraint failed")) return true;
  }
  return false;
}

function revalidatePublic(slug?: string) {
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/projects/${slug}`);
}

async function save(
  kind: ContentKind,
  schema: z.ZodType<Record<string, unknown> & { id?: string }>,
  input: unknown,
): Promise<SaveResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const { id: existingId, ...values } = parsed.data;

  try {
    let savedId: string;

    if (existingId) {
      const row = await updateContent(kind, existingId, { ...values, updatedAt: new Date() });
      if (!row) throw new Error(`${kind} ${existingId} was not found.`);
      savedId = row.id;
    } else {
      savedId = await insertContent(kind, values);
    }

    revalidatePublic(typeof values.slug === "string" ? values.slug : undefined);
    return { ok: true, id: savedId };
  } catch (error) {
    if (kind === "project" && isUniqueViolation(error)) {
      return { ok: false, fieldErrors: { slug: ["Another project already uses this slug."] } };
    }
    throw error;
  }
}

export async function saveProfile(input: unknown): Promise<SaveResult> {
  const existing = await getProfileRow();
  return save("profile", profileSchema, { ...(input as object), id: existing?.id });
}

export const saveExperience = (input: unknown) => save("experience", experienceSchema, input);
export const saveEducation = (input: unknown) => save("education", educationSchema, input);
export const saveSkill = (input: unknown) => save("skill", skillSchema, input);
export const saveSocialLink = (input: unknown) => save("socialLink", socialLinkSchema, input);
export const saveProject = (input: ProjectDraft | unknown) => save("project", projectSchema, input);

async function setPublication(kind: ContentKind, id: string, state: "published" | "draft") {
  const row = await setContentPublicationState(kind, id, state);
  if (!row) throw new Error(`${kind} ${id} was not found.`);
  revalidatePublic(row.slug);
}

export const publishContent = (kind: ContentKind, id: string) => setPublication(kind, id, "published");
export const unpublishContent = (kind: ContentKind, id: string) => setPublication(kind, id, "draft");

export const publishProject = (id: string) => publishContent("project", id);
export const unpublishProject = (id: string) => unpublishContent("project", id);
export const publishProfile = (id: string) => publishContent("profile", id);
export const unpublishProfile = (id: string) => unpublishContent("profile", id);
export const publishExperience = (id: string) => publishContent("experience", id);
export const unpublishExperience = (id: string) => unpublishContent("experience", id);
export const publishSkill = (id: string) => publishContent("skill", id);
export const unpublishSkill = (id: string) => unpublishContent("skill", id);

export async function deleteContent(kind: ContentKind, id: string) {
  const row = await deleteContentRow(kind, id);
  if (!row) throw new Error(`${kind} ${id} was not found.`);
  revalidatePublic(row.slug);
}
