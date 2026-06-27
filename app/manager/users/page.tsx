import { UserManager } from "@/components/manager/users/user-manager";
import { ManagerPageHeader } from "@/components/manager/page-header";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";

export default async function ManagerUsersPage() {
  const locale = await getCurrentLocale();
  const dict = getDictionary(locale);

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        eyebrow={dict.manager.users.eyebrow}
        title={dict.manager.users.title}
        description="Create users, edit profiles, delete accounts, and manage role assignments from the backend."
      />
      <UserManager />
    </div>
  );
}
