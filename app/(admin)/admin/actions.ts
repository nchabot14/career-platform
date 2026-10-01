"use server";

import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth/owner";
import { transitionContactMessageStatus } from "@/lib/db/repositories/contact-messages";
import type { ContactMessageStatus } from "@/lib/db/schema";
import {
  deleteContent,
  publishContent,
  saveEducation,
  saveExperience,
  saveProfile,
  saveProject,
  saveSkill,
  saveSocialLink,
  unpublishContent,
  type ContentKind,
  type FieldErrors,
  type SaveResult,
} from "@/lib/services/content-management";
import { replaceCurrentResume, ResumeUploadError } from "@/lib/storage/resumes";
import { toUploadedFile } from "@/lib/storage/uploaded-file";

export type FormState = {
  fieldErrors: FieldErrors;
  values: Record<string, string>;
  message?: string;
};

const sections: Record<ContentKind, { path: string; save: (input: unknown) => Promise<SaveResult> }> = {
  profile: { path: "/admin/profile", save: saveProfile },
  experience: { path: "/admin/experience", save: saveExperience },
  education: { path: "/admin/education", save: saveEducation },
  skill: { path: "/admin/skills", save: saveSkill },
  socialLink: { path: "/admin/links", save: saveSocialLink },
  project: { path: "/admin/projects", save: saveProject },
};

function formValues(formData: FormData) {
  const values: Record<string, string> = {};
  for (const [key, value] of formData) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  return values;
}

export async function saveContentAction(
  kind: ContentKind,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();

  const values = formValues(formData);
  const result = await sections[kind].save(values);

  if (!result.ok) {
    return { fieldErrors: result.fieldErrors, values, message: "Fix the highlighted fields and save again." };
  }

  redirect(`${sections[kind].path}?saved=1`);
}

export async function setPublicationAction(
  kind: ContentKind,
  id: string,
  state: "published" | "draft",
) {
  await requireOwner();

  if (state === "published") await publishContent(kind, id);
  else await unpublishContent(kind, id);

  redirect(sections[kind].path);
}

export async function deleteContentAction(kind: ContentKind, id: string, formData: FormData) {
  await requireOwner();

  if (formData.get("confirm") !== "yes") redirect(`${sections[kind].path}?error=confirm`);

  await deleteContent(kind, id);
  redirect(`${sections[kind].path}?deleted=1`);
}

export type UploadState = { error?: string; message?: string };

export async function uploadResumeAction(
  _previous: UploadState,
  formData: FormData,
): Promise<UploadState> {
  await requireOwner();

  const file = formData.get("resume");
  if (!(file instanceof File)) return { error: "Choose a PDF file to upload." };

  try {
    const resume = await replaceCurrentResume(await toUploadedFile(file));
    return { message: `Uploaded ${resume.filename}. It is now the published resume.` };
  } catch (error) {
    if (error instanceof ResumeUploadError) return { error: error.message };
    throw error;
  }
}

export async function setMessageStatusAction(id: string, status: ContactMessageStatus) {
  await requireOwner();

  await transitionContactMessageStatus(id, status);
  redirect("/admin/messages");
}
