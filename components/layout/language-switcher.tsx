"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

  return (
    <div className="inline-flex items-center rounded-md border border-border bg-background p-0.5" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="flex">
        {locales.map((item) => (
          <Link
            key={item}
            href={`/api/locale?locale=${item}&next=${encodeURIComponent(pathname)}`}
            className={cn(
              "rounded px-1.5 py-1 text-xs font-semibold transition-colors sm:px-2",
              locale === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
            aria-current={locale === item ? "true" : undefined}
          >
            <span aria-hidden="true">{compactLabels[item]}</span>
            <span className="sr-only">{localeLabels[item]}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
