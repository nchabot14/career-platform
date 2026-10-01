import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  contactMessages,
  type ContactMessage,
  type ContactMessageStatus,
  type ContactNotificationStatus,
  type NewContactMessage,
} from "@/lib/db/schema";

export async function createContactMessage(
  input: NewContactMessage,
): Promise<ContactMessage> {
  const [message] = await db.insert(contactMessages).values(input).returning();

  return message;
}

export async function transitionContactMessageStatus(
  id: string,
  status: ContactMessageStatus,
): Promise<ContactMessage> {
  const [message] = await db
    .update(contactMessages)
    .set({ status, updatedAt: new Date() })
    .where(eq(contactMessages.id, id))
    .returning();

  if (!message) {
    throw new Error(`Contact message ${id} was not found.`);
  }

  return message;
}

export async function setContactNotificationStatus(
  id: string,
  notificationStatus: ContactNotificationStatus,
) {
  await db
    .update(contactMessages)
    .set({ notificationStatus, updatedAt: new Date() })
    .where(eq(contactMessages.id, id));
}

export async function listContactMessages(): Promise<ContactMessage[]> {
  return db.select().from(contactMessages).orderBy(desc(contactMessages.submittedAt));
}
