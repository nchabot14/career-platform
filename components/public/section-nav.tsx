"use client";

import { useEffect, useState } from "react";

type SectionNavProps = Readonly<{
  items: { id: string; label: string }[];
}>;

export function SectionNav({ items }: SectionNavProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    // Without the observer the links still jump; only the highlight is lost.
    if (typeof IntersectionObserver === "undefined") return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        setActiveId(items.find((item) => visible.has(item.id))?.id ?? null);
      },
      // A band across the upper part of the viewport: a section counts as
      // current while it occupies the area the reader is looking at.
      { rootMargin: "-15% 0px -55% 0px" },
    );

    for (const item of items) {
      const section = document.getElementById(item.id);
      if (section) observer.observe(section);
    }

    return () => observer.disconnect();
  }, [items]);

  return (
    <nav
      aria-label="Resume sections"
      className="sticky top-0 z-10 -mx-6 -mt-16 mb-10 border-b border-slate-200 bg-slate-50/95 px-6 backdrop-blur sm:-mx-10 sm:px-10 lg:top-10 lg:m-0 lg:self-start lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
    >
      <ul className="-mx-2 flex overflow-x-auto lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible">
        {items.map((item) => {
          const active = item.id === activeId;

          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={active ? "location" : undefined}
                className={`block whitespace-nowrap rounded-md px-2 py-3 lg:px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-sky-600 lg:py-1.5 ${
                  active
                    ? "font-semibold text-sky-700"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
