import { saveContentAction } from "@/app/(admin)/admin/actions";
import { ContentStatusControl } from "@/components/admin/content-status-control";
import { EntityForm, type FieldConfig } from "@/components/admin/entity-form";
import { noticeFrom, type AdminPageProps } from "@/components/admin/notice";
import { getProfileRow } from "@/lib/db/repositories/content";

export const dynamic = "force-dynamic";

const fields: FieldConfig[] = [
  { name: "name", label: "Name", required: true },
  { name: "headline", label: "Headline", required: true },
  { name: "summary", label: "Summary", type: "textarea", required: true, rows: 6 },
  { name: "location", label: "Location" },
  { name: "availability", label: "Availability" },
];

export default async function AdminProfilePage({ searchParams }: AdminPageProps) {
  const [profile, params] = await Promise.all([getProfileRow(), searchParams]);
  const notice = noticeFrom(params);

  return (
    <section aria-labelledby="profile-heading" className="max-w-2xl space-y-5">
      <h2 id="profile-heading" className="text-2xl font-semibold text-slate-950">
        Profile
      </h2>
      {notice ? (
        <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </p>
      ) : null}
      {profile ? (
        <ContentStatusControl
          kind="profile"
          id={profile.id}
          label="profile"
          publicationState={profile.publicationState}
          allowDelete={false}
        />
      ) : null}
      <EntityForm
        action={saveContentAction.bind(null, "profile")}
        fields={fields}
        initialValues={
          profile
            ? {
                name: profile.name,
                headline: profile.headline,
                summary: profile.summary,
                location: profile.location ?? "",
                availability: profile.availability ?? "",
              }
            : {}
        }
        submitLabel="Save profile"
      />
    </section>
  );
}
