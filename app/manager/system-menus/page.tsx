import { SystemMenuManager } from "@/components/manager/system-menus/system-menu-manager";
import { ManagerPageHeader } from "@/components/manager/page-header";

export default function SystemMenusPage() {
  return (
    <div className="space-y-6">
      <ManagerPageHeader
        eyebrow="System"
        title="System menus"
        description="Admin CRUD for the menu records that drive manager navigation and role-based access."
      />
      <SystemMenuManager />
    </div>
  );
}
