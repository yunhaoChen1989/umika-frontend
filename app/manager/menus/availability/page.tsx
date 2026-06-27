import { ManagerPageHeader } from "@/components/manager/page-header";
import { MenuCatalogManager } from "@/components/manager/menus/menu-catalog-manager";

export default function ManagerMenuAvailabilityPage() {
  return (
    <div className="space-y-6">
      <ManagerPageHeader
        eyebrow="Menus"
        title="Menu images"
        description="Keep the item photo layer organized so the public menu shows the right image for each dish."
      />
      <MenuCatalogManager initialKind="image" />
    </div>
  );
}
