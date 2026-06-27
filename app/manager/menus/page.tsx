import { ManagerPageHeader } from "@/components/manager/page-header";
import { MenuCatalogManager } from "@/components/manager/menus/menu-catalog-manager";

export default function ManagerMenusPage() {
  return (
    <div className="space-y-6">
      <ManagerPageHeader
        eyebrow="Menus"
        title="Restaurant menu"
        description="Create and maintain menu categories, items, and item images for each store. The tree below mirrors the live menu structure."
      />
      <MenuCatalogManager initialKind="category" />
    </div>
  );
}
