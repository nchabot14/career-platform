import type { ContactMessage } from "@/lib/db/schema";
import { EmailNotConfiguredError, sendEmail } from "@/lib/email/resend";

export function renderContactNotification(message: ContactMessage) {
  return {
    subject: `New contact message: ${message.subject}`,
    text: [
      `From: ${message.senderName} <${message.senderEmail}>`,
      `Received: ${message.submittedAt.toISOString()}`,
      `Subject: ${message.subject}`,
      "",
      message.message,
      "",
      "Reply to this email to answer the sender, or open the dashboard at /admin/messages.",
    ].join("\n"),
  };
}

export async function sendContactNotification(message: ContactMessage) {
  const to = process.env.CONTACT_NOTIFICATION_EMAIL;
  if (!to) throw new EmailNotConfiguredError();

  await sendEmail({ to, replyTo: message.senderEmail, ...renderContactNotification(message) });
}
