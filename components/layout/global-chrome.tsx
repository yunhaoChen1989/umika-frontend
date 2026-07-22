"use client";

import { usePathname } from "next/navigation";

import { ProfileCompletionDialog } from "@/components/account/profile-completion-dialog";
import { LocationCodeKeeper } from "@/components/layout/location-code-keeper";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import type { Locale } from "@/lib/i18n";

export function GlobalChrome({ children, locale }: { children: React.ReactNode; locale: Locale }) {
  const pathname = usePathname();
  const isManagerRoute = pathname.startsWith("/manager");

  if (isManagerRoute) {
    return (
      <>
        <LocationCodeKeeper />
        {children}
        <ProfileCompletionDialog locale={locale} />
      </>
    );
  }

  return (
    <>
      <LocationCodeKeeper />
      <SiteHeader locale={locale} />
      <main>{children}</main>
      <SiteFooter locale={locale} />
      <ProfileCompletionDialog locale={locale} />
    </>
  );
}
