import { ManagerPageHeader } from "@/components/manager/page-header";
import { MenuCatalogManager } from "@/components/manager/menus/menu-catalog-manager";

export default function ManagerMenuItemsPage() {
  return (
    <div className="space-y-6">
      <ManagerPageHeader
        eyebrow="Menus"
        title="Menu items"
        description="Manage menu items and their item photos for the selected store."
      />
      <MenuCatalogManager initialKind="item" />
    </div>
  );
}
