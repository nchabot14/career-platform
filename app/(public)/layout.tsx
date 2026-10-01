type PublicLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-14 px-6 py-16 sm:px-10">
      {children}
    </div>
  );
}
