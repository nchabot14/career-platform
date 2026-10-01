type SearchParams = Record<string, string | string[] | undefined>;

export function noticeFrom(params: SearchParams) {
  if (params.saved) return "Saved.";
  if (params.deleted) return "Deleted.";
  if (params.error === "confirm") return "Tick the confirmation box to delete.";
  return undefined;
}

export function editIdFrom(params: SearchParams) {
  return typeof params.edit === "string" ? params.edit : undefined;
}

export type AdminPageProps = Readonly<{ searchParams: Promise<SearchParams> }>;
