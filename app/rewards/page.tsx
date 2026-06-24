import { Copy, Gift, Share2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getLocalizedRewardTransactions } from "@/lib/localized-data";

export default async function RewardsPage() {
  const locale = await getCurrentLocale();
  const dict = getDictionary(locale);
  const rewardTransactions = getLocalizedRewardTransactions(locale);
  const balance = rewardTransactions.reduce((sum, transaction) => sum + transaction.points, 0);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg bg-foreground p-7 text-background">
          <Gift className="h-8 w-8 text-amber-200" />
          <h1 className="mt-6 font-serif text-4xl font-semibold sm:text-5xl">{balance} {dict.rewardsPage.points}</h1>
          <p className="mt-4 max-w-md text-background/72">
            {dict.rewardsPage.copy}
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary" className="w-full sm:w-auto">{dict.rewardsPage.redeem}</Button>
            <Button variant="outline" className="w-full border-background/30 bg-transparent text-background hover:bg-background/10 sm:w-auto">
              <Share2 className="h-4 w-4" />
              {dict.rewardsPage.invite}
            </Button>
          </div>
        </div>
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
              <CardTitle>{dict.rewardsPage.referralCode}</CardTitle>
              <Badge>{dict.rewardsPage.earn}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border bg-muted px-4 py-3">
              <span className="min-w-0 break-all font-mono text-sm font-semibold">UMIKA-MEI-24</span>
              <Button size="icon" variant="ghost" aria-label={dict.rewardsPage.copyCode}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {dict.rewardsPage.codeHelp}
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="mt-8">
        <h2 className="text-2xl font-semibold">{dict.rewardsPage.history}</h2>
        <div className="mt-4 overflow-hidden rounded-lg border bg-card">
          {rewardTransactions.map((transaction) => (
            <div key={transaction.id} className="grid grid-cols-[1fr_auto] gap-4 border-b p-4 last:border-b-0 sm:grid-cols-[1fr_auto_auto]">
              <div>
                <p className="font-medium">{transaction.label}</p>
                <p className="text-sm text-muted-foreground">{transaction.type}</p>
              </div>
              <span className="text-sm text-muted-foreground">{transaction.date}</span>
              <span className={transaction.points > 0 ? "font-semibold text-accent" : "font-semibold text-primary"}>
                {transaction.points > 0 ? "+" : ""}
                {transaction.points}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
