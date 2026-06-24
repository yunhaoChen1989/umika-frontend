import { ShieldPlus } from "lucide-react";

import { ManagerPageHeader } from "@/components/manager/page-header";
import { StatusPill } from "@/components/manager/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getLocalizedManagerUsers } from "@/lib/localized-data";

export default async function UserPermissionsPage() {
  const locale = await getCurrentLocale();
  const dict = getDictionary(locale);
  const allUsers = getLocalizedManagerUsers(locale);
  const users = allUsers.filter((user) => user.role !== "ROLE_CUSTOMER");

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        eyebrow={dict.manager.userPermissions.eyebrow}
        title={dict.manager.userPermissions.title}
        description={dict.manager.userPermissions.description}
        actions={
          <Button className="w-full sm:w-auto">
            <ShieldPlus className="h-4 w-4" />
            {dict.manager.userPermissions.add}
          </Button>
        }
      />

      <Card className="overflow-hidden rounded-md shadow-none">
        <CardContent className="p-0">
          {users.map((user) => (
            <div key={user.id} className="border-b border-slate-200 p-5 last:border-b-0">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-950">{user.name}</p>
                    <StatusPill tone={user.status}>{user.status}</StatusPill>
                  </div>
                  <p className="mt-1 break-words text-sm text-slate-500">
                    {user.email} / {user.locationName}
                  </p>
                </div>
                <div className="flex max-w-3xl flex-wrap gap-2">
                  {user.permissions.map((permission) => (
                    <span key={permission} className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
