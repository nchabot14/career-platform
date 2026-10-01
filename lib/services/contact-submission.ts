import { z } from "zod";
import {
  createContactMessage,
  setContactNotificationStatus,
} from "@/lib/db/repositories/contact-messages";
import { sendContactNotification } from "@/lib/email/contact-notification";
import { logServerError } from "@/lib/observability/logger";
import { takeContactAttempt } from "@/lib/security/rate-limit";

export type ContactSubmission = { name: string; email: string; subject: string; message: string };

export type ContactResult =
  | { ok: true; id: string; notificationStatus: "sent" | "failed" }
  | { ok: false; reason: "validation"; fieldErrors: Partial<Record<keyof ContactSubmission, string[]>> }
  | { ok: false; reason: "rate_limited" };

const text = (label: string, max: number) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

const contactSchema = z.object({
  name: text("Name", 100),
  email: text("Email", 254).pipe(z.email("Enter a valid email address.")),
  subject: text("Subject", 150),
  message: text("Message", 5000),
});

export async function submitContactMessage(
  input: unknown,
  requestKey: string,
): Promise<ContactResult> {
  if (!takeContactAttempt(requestKey)) return { ok: false, reason: "rate_limited" };

  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, reason: "validation", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  // Save first so a message is never lost to an email outage.
  const message = await createContactMessage({
    senderName: parsed.data.name,
    senderEmail: parsed.data.email,
    subject: parsed.data.subject,
    message: parsed.data.message,
    notificationStatus: "pending",
  });

  let notificationStatus: "sent" | "failed" = "sent";
  try {
    await sendContactNotification(message);
  } catch (error) {
    notificationStatus = "failed";
    logServerError("contact_notification_failed", error, { messageId: message.id });
  }

  await setContactNotificationStatus(message.id, notificationStatus);
  return { ok: true, id: message.id, notificationStatus };
}
