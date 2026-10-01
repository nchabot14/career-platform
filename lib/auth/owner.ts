import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/server";

export type AuthenticatedOwner = {
  id: string;
  email: string;
};

export class OwnerAuthorizationError extends Error {
  readonly code = "OWNER_FORBIDDEN";
  readonly status = 403;

  constructor(email?: string) {
    super(
      email
        ? `Authenticated user ${email} is not authorized to access the owner dashboard.`
        : "Authenticated user is not authorized to access the owner dashboard.",
    );
    this.name = "OwnerAuthorizationError";
  }
}

function getOwnerEmail() {
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();

  if (!ownerEmail) {
    throw new Error("Missing required OWNER_EMAIL environment variable.");
  }

  return ownerEmail;
}

export async function requireOwner(): Promise<AuthenticatedOwner> {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const ownerEmail = getOwnerEmail();
  const normalizedEmail = user.email.trim().toLowerCase();

  if (normalizedEmail !== ownerEmail) {
    throw new OwnerAuthorizationError(normalizedEmail);
  }

  return {
    id: user.id,
    email: normalizedEmail,
  };
}
