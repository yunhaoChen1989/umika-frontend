import { SystemMenuManager } from "@/components/manager/settings/system-menus/system-menu-manager";
import { ManagerPageHeader } from "@/components/manager/page-header";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";

export default async function SystemMenusPage() {
  const locale = await getCurrentLocale();
  const copy = getDictionary(locale).manager.systemMenus;

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />
      <SystemMenuManager />
    </div>
  );
}
