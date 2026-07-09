import { ManagerPageHeader } from "@/components/manager/page-header";
import { MenuRecommendationManager } from "@/components/manager/menus/menu-recommendation-manager";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";

export default async function ManagerRecommendationsPage() {
  const locale = await getCurrentLocale();
  const copy = getDictionary(locale).manager.pages.recommendations;

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />
      <MenuRecommendationManager />
    </div>
  );
}
