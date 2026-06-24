import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Gift, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getDictionary, type Locale } from "@/lib/i18n";

export function Hero({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);

  return (
    <section className="relative min-h-[calc(100svh-4rem)] overflow-hidden" aria-labelledby="home-hero-title">
      <Image
        src="/images/umika-hero.png"
        alt="Fresh sushi and sashimi spread at Umika Sushi"
        fill
        priority
        sizes="100vw"
        className="object-cover object-[58%_50%] sm:object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/82 via-black/48 to-black/18" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/30 to-transparent" />
      <div className="relative mx-auto flex min-h-[calc(100svh-4rem)] max-w-7xl items-center px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-2xl text-white">
          <p className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full bg-white/14 px-3 py-1 text-sm backdrop-blur">
            <Star className="h-4 w-4 text-amber-200" />
            {dict.home.heroBadge}
          </p>
          <h1 id="home-hero-title" className="font-serif text-4xl font-semibold leading-tight sm:text-6xl lg:text-7xl">
            {dict.home.heroTitle}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/86 sm:text-lg sm:leading-8">
            {dict.home.heroCopy}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/order">
                {dict.home.startOrder}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
              <Link href="/rewards">
                <Gift className="h-4 w-4" />
                {dict.home.viewRewards}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
