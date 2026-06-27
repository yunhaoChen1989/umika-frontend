import { ManagerPageHeader } from "@/components/manager/page-header";
import { MenuCatalogManager } from "@/components/manager/menus/menu-catalog-manager";

export default function ManagerMenuCategoriesPage() {
  return (
    <div className="space-y-6">
      <ManagerPageHeader
        eyebrow="Menus"
        title="Menu categories"
        description="Manage the category layer of the restaurant menu tree for the selected store."
      />
      <MenuCatalogManager initialKind="category" />
    </div>
  );
}
