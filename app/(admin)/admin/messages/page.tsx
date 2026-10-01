import Link from "next/link";
import { setMessageStatusAction } from "@/app/(admin)/admin/actions";
import { listContactMessages } from "@/lib/db/repositories/contact-messages";
import type { ContactMessageStatus } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const filters: { value: ContactMessageStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
  { value: "archived", label: "Archived" },
];

const actions: { status: ContactMessageStatus; label: string }[] = [
  { status: "read", label: "Mark read" },
  { status: "unread", label: "Mark unread" },
  { status: "archived", label: "Archive" },
];

type MessagesPageProps = Readonly<{ searchParams: Promise<{ status?: string }> }>;

export default async function AdminMessagesPage({ searchParams }: MessagesPageProps) {
  const [messages, params] = await Promise.all([listContactMessages(), searchParams]);
  const active = filters.find((filter) => filter.value === params.status)?.value ?? "all";
  const shown = active === "all" ? messages.filter((m) => m.status !== "archived") : messages.filter((m) => m.status === active);

  return (
    <section aria-labelledby="messages-heading" className="space-y-5">
      <h2 id="messages-heading" className="text-2xl font-semibold text-slate-950">
        Messages
      </h2>
      <nav aria-label="Filter messages">
        <ul className="flex gap-2 text-sm">
          {filters.map((filter) => (
            <li key={filter.value}>
              <Link
                href={filter.value === "all" ? "/admin/messages" : `/admin/messages?status=${filter.value}`}
                aria-current={active === filter.value ? "page" : undefined}
                className="rounded-full border border-slate-300 px-3 py-1 aria-[current=page]:bg-slate-950 aria-[current=page]:text-white"
              >
                {filter.label} ({filter.value === "all" ? messages.filter((m) => m.status !== "archived").length : messages.filter((m) => m.status === filter.value).length})
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {shown.length === 0 ? (
        <p className="text-slate-600">No messages here.</p>
      ) : (
        <ul className="space-y-4">
          {shown.map((message) => (
            <li key={message.id}>
              <article className={`space-y-2 rounded-2xl border bg-white p-5 ${message.status === "unread" ? "border-sky-400" : "border-slate-200"}`}>
                <header className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold text-slate-950">{message.subject}</h3>
                  <p className="text-xs text-slate-500">
                    {message.submittedAt.toISOString().replace("T", " ").slice(0, 16)} UTC · {message.status}
                    {message.notificationStatus === "failed" ? " · email alert failed" : null}
                  </p>
                </header>
                <p className="text-sm text-slate-700">
                  {message.senderName} ·{" "}
                  <a href={`mailto:${message.senderEmail}`} className="text-sky-700 underline underline-offset-4">
                    {message.senderEmail}
                  </a>
                </p>
                <p className="whitespace-pre-wrap leading-7 text-slate-800">{message.message}</p>
                <div className="flex flex-wrap gap-2">
                  {actions
                    .filter((action) => action.status !== message.status)
                    .map((action) => (
                      <form key={action.status} action={setMessageStatusAction.bind(null, message.id, action.status)}>
                        <button type="submit" className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold hover:bg-slate-100">
                          {action.label}
                        </button>
                      </form>
                    ))}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
