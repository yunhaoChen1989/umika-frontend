import { ManagerPageHeader } from "@/components/manager/page-header";
import { MenuRecommendationManager } from "@/components/manager/menus/menu-recommendation-manager";

export default function ManagerRecommendationsPage() {
  return (
    <div className="space-y-6">
      <ManagerPageHeader
        eyebrow="Recommendations"
        title="Menu recommendations"
        description="Choose the recommended menu items shown on the homepage for the current header location."
      />
      <MenuRecommendationManager />
    </div>
  );
}
