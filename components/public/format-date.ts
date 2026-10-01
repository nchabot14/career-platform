const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Dates are stored as YYYY-MM-DD strings; format without time zones.
export function formatMonthYear(value: string) {
  const [year, month] = value.split("-");
  const name = months[Number(month) - 1];

  return name ? `${name} ${year}` : year;
}

export function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) return null;
  if (!start) return formatMonthYear(end!);

  return `${formatMonthYear(start)} – ${end ? formatMonthYear(end) : "Present"}`;
}
