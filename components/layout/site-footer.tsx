import Link from "next/link";

import { LoginRedirectLink } from "@/components/auth/login-redirect-link";
import { FooterLocation } from "@/components/layout/footer-location";
import { getDictionary, type Locale } from "@/lib/i18n";

export function SiteFooter({ locale, showLocationInfo = false }: { locale: Locale; showLocationInfo?: boolean }) {
  const dict = getDictionary(locale);

  return (
    <footer className="border-t bg-foreground text-background">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
        <div>
          <p className="font-serif text-2xl font-semibold">{dict.common.brand}</p>
          <p className="mt-3 max-w-md text-sm leading-6 text-background/72">
            {dict.common.footerCopy}
          </p>
        </div>
        <div className="text-sm">
          <p className="font-semibold">{dict.common.visit}</p>
          {showLocationInfo ? (
            <FooterLocation />
          ) : (
            <>
              <p className="mt-3 text-background/72">Toronto, Ontario</p>
              <p className="text-background/72">umikasushi.ca</p>
            </>
          )}
        </div>
        <div className="text-sm">
          <p className="font-semibold">{dict.common.quickLinks}</p>
          <div className="mt-3 flex flex-col gap-2 text-background/72">
            <Link href="/menu">{dict.common.menu}</Link>
            <Link href="/rewards">{dict.common.rewards}</Link>
            <LoginRedirectLink>{dict.common.login}</LoginRedirectLink>
          </div>
        </div>
      </div>
    </footer>
  );
}
