import { Check, ShieldCheck } from "lucide-react";

import { ManagerPageHeader } from "@/components/manager/page-header";
import { StatusPill } from "@/components/manager/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getLocalizedManagerPermissions, getLocalizedManagerRoleAccess } from "@/lib/localized-data";

export default async function RolePermissionPage() {
  const locale = await getCurrentLocale();
  const dict = getDictionary(locale);
  const roles = getLocalizedManagerRoleAccess(locale);
  const permissions = getLocalizedManagerPermissions(locale);

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        eyebrow={dict.manager.roles.eyebrow}
        title={dict.manager.roles.title}
        description={dict.manager.roles.description}
        actions={
          <Button className="w-full sm:w-auto">
            <ShieldCheck className="h-4 w-4" />
            {dict.manager.roles.save}
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        {roles.map((role) => (
          <Card key={role.role} className="rounded-md shadow-none">
            <CardHeader className="border-b border-slate-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">{role.label}</CardTitle>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{role.description}</p>
                </div>
                <StatusPill tone={role.scope === "Global" ? "global" : "store"}>{role.scope}</StatusPill>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{dict.manager.roles.menus}</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{role.menuCodes.length} {dict.manager.roles.screensAssigned}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{dict.manager.roles.permissions}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {role.permissionCodes.slice(0, 8).map((permission) => (
                    <span key={permission} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {permission}
                    </span>
                  ))}
                  {role.permissionCodes.length > 8 ? (
                    <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                      +{role.permissionCodes.length - 8} {dict.manager.roles.more}
                    </span>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden rounded-md shadow-none">
        <CardHeader className="border-b border-slate-200">
          <CardTitle className="text-base">{dict.manager.roles.matrix}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="grid min-w-[980px] grid-cols-[220px_1fr_110px_110px_110px] border-b border-slate-200 bg-slate-100 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
              {dict.manager.roles.columns.map((column) => (
                <span key={column}>{column}</span>
              ))}
            </div>
            {permissions.map((permission) => (
              <div
                key={permission.code}
                className="grid min-w-[980px] grid-cols-[220px_1fr_110px_110px_110px] items-center border-b border-slate-200 px-5 py-4 last:border-b-0"
              >
                <div>
                  <p className="font-mono text-xs font-semibold text-slate-950">{permission.code}</p>
                  <p className="mt-1 text-xs text-slate-500">{permission.group}</p>
                </div>
                <p className="text-sm text-slate-600">{permission.description}</p>
                {roles.map((role) => (
                  <span key={role.role} className="text-slate-900">
                    {role.permissionCodes.includes(permission.code) ? <Check className="h-4 w-4 text-emerald-600" /> : "-"}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
