"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Check, ChevronDown, Globe2 } from "lucide-react";

import { localeLabels, locales, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const compactLabels: Record<Locale, string> = {
  en: "EN",
  zh: "中",
  ko: "KO",
};

export function LanguageSwitcher({
  locale,
  label,
}: {
  locale: Locale;
  label: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const nextPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", closeMenu);

    return () => {
      document.removeEventListener("mousedown", closeMenu);
    };
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="inline-flex h-10 items-center justify-center gap-1 rounded-md border border-border bg-white px-2 text-sm font-bold text-slate-900 shadow-sm transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={label}
        onClick={() => setIsOpen((current) => !current)}
      >
        <Globe2 className="h-4 w-4" />
        <span className="hidden text-xs sm:inline">{compactLabels[locale]}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {isOpen ? (
        <div
          className="absolute right-0 top-12 z-50 min-w-44 overflow-hidden rounded-md border border-slate-200 bg-white py-1 text-slate-950 shadow-xl ring-1 ring-black/5"
          role="menu"
          aria-label={label}
        >
        {locales.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setIsOpen(false);
              window.location.href = `/api/locale?locale=${item}&next=${encodeURIComponent(nextPath)}`;
            }}
            className={cn(
              "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm font-semibold transition-colors hover:bg-primary/10 hover:text-slate-950",
              locale === item ? "bg-primary/10 text-slate-950" : "text-slate-700",
            )}
            aria-current={locale === item ? "true" : undefined}
            role="menuitem"
          >
            <span>{localeLabels[item]}</span>
            {locale === item ? <Check className="h-4 w-4" /> : null}
          </button>
        ))}
        </div>
      ) : null}
    </div>
  );
}
