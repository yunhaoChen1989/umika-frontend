import { MailPlus, ShieldCheck, UserCog } from "lucide-react";

import { ManagerPageHeader } from "@/components/manager/page-header";
import { StatusPill } from "@/components/manager/status-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getLocalizedManagerUsers } from "@/lib/localized-data";

const roleLabels = {
  ROLE_ADMIN: "Admin",
  ROLE_MANAGER: "Manager",
  ROLE_STAFF: "Staff",
  ROLE_CUSTOMER: "Customer",
};

export default async function ManagerUsersPage() {
  const locale = await getCurrentLocale();
  const dict = getDictionary(locale);
  const users = getLocalizedManagerUsers(locale);

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        eyebrow={dict.manager.users.eyebrow}
        title={dict.manager.users.title}
        description={dict.manager.users.description}
        actions={
          <>
            <Button variant="outline" className="w-full sm:w-auto">
              <UserCog className="h-4 w-4" />
              {dict.manager.users.bulk}
            </Button>
            <Button className="w-full sm:w-auto">
              <MailPlus className="h-4 w-4" />
              {dict.manager.users.invite}
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden rounded-md shadow-none">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="grid min-w-[900px] grid-cols-[1.4fr_130px_150px_120px_1fr_120px] border-b border-slate-200 bg-slate-100 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
              {dict.manager.users.columns.map((column) => (
                <span key={column}>{column}</span>
              ))}
            </div>
            {users.map((user) => (
              <div
                key={user.id}
                className="grid min-w-[900px] grid-cols-[1.4fr_130px_150px_120px_1fr_120px] items-center border-b border-slate-200 px-5 py-4 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-950">{user.name}</p>
                  <p className="truncate text-sm text-slate-500">{user.email}</p>
                </div>
                <Badge className="w-fit rounded-md bg-slate-100 text-slate-700">{roleLabels[user.role]}</Badge>
                <StatusPill tone={user.status}>{user.status}</StatusPill>
                <span className="text-sm font-semibold text-slate-900">{user.points}</span>
                <div>
                  <p className="text-sm font-medium text-slate-900">{user.locationName}</p>
                  <p className="mt-1 text-xs text-slate-500">{user.lastSeen}</p>
                </div>
                <Button variant="outline" size="sm">
                  <ShieldCheck className="h-4 w-4" />
                  {dict.manager.users.access}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
