import Link from "next/link";
import { BadgeDollarSign, Cake, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getDictionary, type Locale } from "@/lib/i18n";

const rewards = [
  { icon: BadgeDollarSign, title: "$1 = 1 point", copy: "Points post after paid pickup orders." },
  { icon: Share2, title: "Referral rewards", copy: "Invite a friend and earn after their first eligible order." },
  { icon: Cake, title: "Birthday bonus", copy: "Members receive 100 bonus points during their birthday month." },
];

export function RewardsSummary({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);

  return (
    <section className="bg-secondary py-16 sm:py-20" aria-labelledby="rewards-title">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">{dict.home.rewardsEyebrow}</p>
          <h2 id="rewards-title" className="mt-2 font-serif text-3xl font-semibold leading-tight sm:text-4xl">
            {dict.home.rewardsTitle}
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
            {dict.home.rewardsCopy}
          </p>
          <Button asChild className="mt-7 w-full sm:w-auto">
            <Link href="/rewards">{dict.home.joinRewards}</Link>
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {rewards.map((reward, index) => (
            <article key={reward.title} className="rounded-lg bg-background p-5">
              <reward.icon className="h-6 w-6 text-accent" />
              <h3 className="mt-4 font-semibold">{dict.rewardsSummary[index][0]}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{dict.rewardsSummary[index][1]}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
