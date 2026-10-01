type SectionProps = Readonly<{
  id: string;
  title: string;
  children: React.ReactNode;
}>;

export function Section({ id, title, children }: SectionProps) {
  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-5">
      <h2
        id={`${id}-heading`}
        className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
