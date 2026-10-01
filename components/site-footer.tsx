export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-6 text-sm text-slate-600 sm:px-10">
        <p>Building recruiter-ready software experiences.</p>
        <p>&copy; {new Date().getFullYear()} Career Platform</p>
      </div>
    </footer>
  );
}
