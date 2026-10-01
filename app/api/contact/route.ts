import { CONTACT_WINDOW_SECONDS, clientIp, hashRequestKey } from "@/lib/security/rate-limit";
import { submitContactMessage } from "@/lib/services/contact-submission";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send the form as JSON." }, { status: 400 });
  }

  const result = await submitContactMessage(body, hashRequestKey(clientIp(request.headers)));

  if (!result.ok && result.reason === "rate_limited") {
    return Response.json(
      { error: "Too many messages from your network. Please try again in an hour." },
      { status: 429, headers: { "Retry-After": String(CONTACT_WINDOW_SECONDS) } },
    );
  }

  if (!result.ok) {
    return Response.json(
      { error: "Please fix the highlighted fields.", fieldErrors: result.fieldErrors },
      { status: 422 },
    );
  }

  if (result.notificationStatus === "failed") {
    return Response.json(
      {
        id: result.id,
        notificationStatus: "failed",
        message: "Thanks — your message was saved and will be read. The instant email alert didn't go through, so a reply may take a little longer.",
      },
      { status: 202 },
    );
  }

  return Response.json(
    { id: result.id, notificationStatus: "sent", message: "Thanks — your message was sent." },
    { status: 201 },
  );
}
