import type { Metadata } from "next";

import { Hero } from "@/components/sections/hero";
import { MenuPreview } from "@/components/sections/menu-preview";
import { RewardsSummary } from "@/components/sections/rewards-summary";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";

const siteUrl = "https://umikasushi.ca";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const dict = getDictionary(locale);

  return {
    title: dict.home.title,
    description: dict.home.description,
    alternates: {
      canonical: siteUrl,
    },
    openGraph: {
      title: dict.home.ogTitle,
      description: dict.home.ogDescription,
    url: siteUrl,
    siteName: "Umika Sushi",
    images: [
      {
        url: `${siteUrl}/images/umika-hero.png`,
        width: 1200,
        height: 630,
        alt: "Fresh sushi and sashimi spread from Umika Sushi",
      },
    ],
      locale: locale === "zh" ? "zh_CN" : locale === "ko" ? "ko_KR" : "en_CA",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: dict.home.title,
      description: dict.home.description,
      images: [`${siteUrl}/images/umika-hero.png`],
    },
  };
}

const baseRestaurantJsonLd = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  name: "Umika Sushi",
  url: siteUrl,
  image: `${siteUrl}/images/umika-hero.png`,
  servesCuisine: ["Sushi", "Japanese", "Sashimi"],
  priceRange: "$$",
  acceptsReservations: false,
  potentialAction: {
    "@type": "OrderAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${siteUrl}/order`,
      inLanguage: "en-CA",
      actionPlatform: [
        "https://schema.org/DesktopWebPlatform",
        "https://schema.org/MobileWebPlatform",
      ],
    },
    deliveryMethod: "https://schema.org/OnSitePickup",
  },
};

export default async function HomePage() {
  const locale = await getCurrentLocale();
  const dict = getDictionary(locale);
  const restaurantJsonLd = {
    ...baseRestaurantJsonLd,
    potentialAction: {
      ...baseRestaurantJsonLd.potentialAction,
      target: {
        ...baseRestaurantJsonLd.potentialAction.target,
        inLanguage: locale === "zh" ? "zh-CN" : locale === "ko" ? "ko" : "en-CA",
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantJsonLd) }}
      />
      <Hero locale={locale} />
      <MenuPreview locale={locale} />
      <RewardsSummary locale={locale} />
      <section className="bg-background py-14 sm:py-16 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">{dict.home.onlineOrdering}</p>
            <h2 className="mt-2 max-w-xl font-serif text-3xl font-semibold leading-tight sm:text-4xl">
              {dict.home.pickupTitle}
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {dict.home.steps.map(([title, copy], index) => (
              <article key={title} className="rounded-lg border bg-card p-5">
                <span className="grid h-8 w-8 place-items-center rounded-md bg-accent text-sm font-semibold text-accent-foreground">
                  {index + 1}
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
