import { ManagerPageHeader } from "@/components/manager/page-header";
import { UserPermissionManager } from "@/components/manager/user-permissions/user-permission-manager";

export default function UserPermissionsPage() {
  return (
    <div className="space-y-6">
      <ManagerPageHeader
        eyebrow="System"
        title="User permissions"
        description="Grant or remove direct system menu access for a specific user."
      />
      <UserPermissionManager />
    </div>
  );
}
