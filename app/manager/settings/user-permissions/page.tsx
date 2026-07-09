import { ManagerPageHeader } from "@/components/manager/page-header";
import { UserPermissionManager } from "@/components/manager/user-permissions/user-permission-manager";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";

export default async function UserPermissionsPage() {
  const locale = await getCurrentLocale();
  const copy = getDictionary(locale).manager.userPermissions;

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />
      <UserPermissionManager />
    </div>
  );
}
