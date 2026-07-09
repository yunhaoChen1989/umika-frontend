import { ManagerPageHeader } from "@/components/manager/page-header";
import { MenuCatalogManager } from "@/components/manager/menus/menu-catalog-manager";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";

export default async function ManagerMenusPage() {
  const locale = await getCurrentLocale();
  const copy = getDictionary(locale).manager.pages.menus;

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />
      <MenuCatalogManager initialKind="category" />
    </div>
  );
}
