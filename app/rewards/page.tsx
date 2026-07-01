import { RewardsClient } from "@/components/rewards/rewards-client";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";

export default async function RewardsPage() {
  const locale = await getCurrentLocale();
  const dict = getDictionary(locale);

  return <RewardsClient copy={dict} />;
}
