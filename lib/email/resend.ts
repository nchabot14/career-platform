import { Resend } from "resend";

export type OutgoingEmail = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
};

export class EmailNotConfiguredError extends Error {
  constructor() {
    super("Email is not configured: set RESEND_API_KEY and CONTACT_NOTIFICATION_EMAIL.");
    this.name = "EmailNotConfiguredError";
  }
}

export async function sendEmail(email: OutgoingEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new EmailNotConfiguredError();

  const from = process.env.CONTACT_FROM_EMAIL || "Career Platform <onboarding@resend.dev>";
  const { error } = await new Resend(apiKey).emails.send({ from, ...email });

  if (error) throw new Error(`Resend rejected the email: ${error.name}`);
}
