import { MenuCatalogClient } from "@/components/menu/menu-catalog-client";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";

export default async function MenuPage() {
  const locale = await getCurrentLocale();
  const dict = getDictionary(locale);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">{dict.menuPage.eyebrow}</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold sm:text-5xl">{dict.menuPage.title}</h1>
        </div>
      </div>
      <MenuCatalogClient copy={dict} locale={locale} />
    </section>
  );
}
