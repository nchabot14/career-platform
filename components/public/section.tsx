type SectionProps = Readonly<{
  id: string;
  title: string;
  children: React.ReactNode;
}>;

export function Section({ id, title, children }: SectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-16 space-y-5 lg:scroll-mt-10">
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
