import Link from "next/link";

import { ManagerIcon } from "@/components/manager/manager-icon";
import { ManagerPageHeader } from "@/components/manager/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getManagerMenus } from "@/lib/manager-api";

export default async function ManagerSettingsPage() {
  const locale = await getCurrentLocale();
  const copy = getDictionary(locale).manager.pages.settings;
  const menus = await getManagerMenus(locale);
  const settingsMenu = menus.find((menu) => menu.code === "MANAGER_SETTINGS" || menu.path === "/manager/settings");
  const children = settingsMenu?.children ?? [];

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {children.length > 0 ? (
          children.map((item) => (
            <Link key={item.code} href={item.path}>
              <Card className="h-full rounded-md shadow-none transition-colors hover:border-primary/40 hover:bg-primary/5">
                <CardContent className="flex items-start gap-3 p-5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <ManagerIcon name={item.icon} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-950">{item.name}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-500">{item.description ?? item.path}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <Card className="rounded-md shadow-none">
            <CardContent className="p-5 text-sm text-slate-500">{copy.empty}</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
