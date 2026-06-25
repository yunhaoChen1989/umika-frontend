"use client";

import { usePathname } from "next/navigation";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import type { Locale } from "@/lib/i18n";

export function GlobalChrome({ children, locale }: { children: React.ReactNode; locale: Locale }) {
  const pathname = usePathname();
  const isManagerRoute = pathname.startsWith("/manager");
  const isHomeRoute = pathname === "/";

  if (isManagerRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader locale={locale} />
      <main>{children}</main>
      <SiteFooter locale={locale} showLocationInfo={isHomeRoute} />
    </>
  );
}
