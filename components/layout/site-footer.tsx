import Link from "next/link";

import { LoginRedirectLink } from "@/components/auth/login-redirect-link";
import { FooterLocation } from "@/components/layout/footer-location";
import { getDictionary, type Locale } from "@/lib/i18n";

export function SiteFooter({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);

  return (
    <footer className="border-t bg-foreground text-background">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <p className="font-serif text-2xl font-semibold">{dict.common.brand}</p>
          <p className="mt-3 max-w-md text-sm leading-6 text-background/72">
            {dict.common.footerCopy}
          </p>
          <div className="mt-5 text-sm">
            <p className="font-semibold">{dict.common.quickLinks}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-background/72">
              <Link href="/menu">{dict.common.menu}</Link>
              <Link href="/rewards">{dict.common.rewards}</Link>
              <LoginRedirectLink>{dict.common.login}</LoginRedirectLink>
            </div>
          </div>
        </div>
        <div className="text-sm">
          <p className="font-semibold">{dict.common.visit}</p>
          <FooterLocation locale={locale} section="contact" />
        </div>
        <div className="text-sm">
          <FooterLocation locale={locale} section="hours" />
        </div>
      </div>
    </footer>
  );
}
