import { RolePermissionManager } from "@/components/manager/roles/role-permission-manager";
import { ManagerPageHeader } from "@/components/manager/page-header";

export default function RolePermissionSettingsPage() {
  return (
    <div className="space-y-6">
      <ManagerPageHeader
        eyebrow="Authorization"
        title="Roles and menu permissions"
        description="Create roles and control which system menus each role can view, layer by layer through the menu tree."
      />
      <RolePermissionManager />
    </div>
  );
}
