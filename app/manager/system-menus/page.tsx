import { MenuSquare } from "lucide-react";

import { ManagerIcon } from "@/components/manager/manager-icon";
import { ManagerPageHeader } from "@/components/manager/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getManagerMenus } from "@/lib/manager-api";
import { getLocalizedManagerMenus } from "@/lib/localized-data";
import type { ManagerMenu } from "@/lib/manager-types";

export default async function SystemMenusPage() {
  const locale = await getCurrentLocale();
  const dict = getDictionary(locale);
  const backendMenus = await getManagerMenus();
  const menus = getLocalizedManagerMenus(locale, backendMenus);

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        eyebrow={dict.manager.systemMenus.eyebrow}
        title={dict.manager.systemMenus.title}
        description={dict.manager.systemMenus.description}
        actions={
          <Button className="w-full sm:w-auto">
            <MenuSquare className="h-4 w-4" />
            {dict.manager.systemMenus.sync}
          </Button>
        }
      />

      <Card className="overflow-hidden rounded-md shadow-none">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="grid min-w-[920px] grid-cols-[1.2fr_1fr_1.3fr_160px_90px] border-b border-slate-200 bg-slate-100 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
              {dict.manager.systemMenus.columns.map((column) => (
                <span key={column}>{column}</span>
              ))}
            </div>
            {menus.map((menu) => (
              <div key={menu.code}>
                <MenuRow menu={menu} noneLabel={dict.manager.systemMenus.none} />
                {menu.children?.map((child) => <MenuRow key={child.code} menu={child} child noneLabel={dict.manager.systemMenus.none} />)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MenuRow({
  menu,
  noneLabel,
  child = false,
}: {
  menu: ManagerMenu;
  noneLabel: string;
  child?: boolean;
}) {
  return (
    <div className="grid min-w-[920px] grid-cols-[1.2fr_1fr_1.3fr_160px_90px] items-center border-b border-slate-200 px-5 py-4 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3">
        <span className={child ? "ml-7" : ""}>
          <ManagerIcon name={menu.icon} className="h-4 w-4 text-primary" />
        </span>
        <span className="truncate font-semibold text-slate-950">{menu.name}</span>
      </div>
      <span className="font-mono text-xs font-semibold text-slate-600">{menu.code}</span>
      <span className="truncate font-mono text-xs text-slate-600">{menu.path}</span>
      <span className="font-mono text-xs text-slate-600">{menu.permission ?? noneLabel}</span>
      <span className="text-sm font-semibold text-slate-900">{menu.sortOrder}</span>
    </div>
  );
}
