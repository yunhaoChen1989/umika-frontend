import { RolePermissionManager } from "@/components/manager/roles/role-permission-manager";
import { ManagerPageHeader } from "@/components/manager/page-header";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";

export default async function RolePermissionSettingsPage() {
  const locale = await getCurrentLocale();
  const copy = getDictionary(locale).manager.roles;

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />
      <RolePermissionManager />
    </div>
  );
}
