"use client";

import { usePathname, useSearchParams } from "next/navigation";

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
  const nextPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  return (
    <div className="inline-flex items-center rounded-md border border-border bg-background p-0.5" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="flex">
        {locales.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              window.location.href = `/api/locale?locale=${item}&next=${encodeURIComponent(nextPath)}`;
            }}
            className={cn(
              "inline-flex items-center justify-center rounded border-0 bg-transparent px-1.5 py-1 text-xs font-semibold transition-colors sm:px-2",
              locale === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
            aria-current={locale === item ? "true" : undefined}
            aria-pressed={locale === item}
          >
            <span aria-hidden="true">{compactLabels[item]}</span>
            <span className="sr-only">{localeLabels[item]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
