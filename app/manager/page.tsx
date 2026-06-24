import { Activity, AlertTriangle, CheckCircle2, ClipboardList } from "lucide-react";

import { ManagerPageHeader } from "@/components/manager/page-header";
import { StatusPill } from "@/components/manager/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getLocalizedManagerDashboard } from "@/lib/localized-data";

const alertIcons = {
  info: Activity,
  warning: AlertTriangle,
  success: CheckCircle2,
};

export default async function ManagerDashboardPage() {
  const locale = await getCurrentLocale();
  const dict = getDictionary(locale);
  const dashboard = getLocalizedManagerDashboard(locale);

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        eyebrow={dict.manager.dashboard.eyebrow}
        title={dict.manager.dashboard.title}
        description={dict.manager.dashboard.description}
        actions={
          <>
            <Button variant="outline" className="w-full sm:w-auto">{dict.manager.dashboard.export}</Button>
            <Button className="w-full sm:w-auto">{dict.manager.dashboard.invite}</Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboard.stats.map((stat) => (
          <Card key={stat.label} className="rounded-md shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-600">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-950">{stat.value}</p>
              <p className="mt-2 text-sm text-slate-500">{stat.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-md shadow-none">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4 text-primary" />
              {dict.manager.dashboard.queue}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {dashboard.alerts.map((alert) => {
              const Icon = alertIcons[alert.severity];
              return (
                <div key={alert.label} className="grid gap-3 border-b border-slate-200 p-5 last:border-b-0 sm:grid-cols-[24px_1fr_auto] sm:items-center">
                  <Icon className="h-5 w-5 text-primary" />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-950">{alert.label}</p>
                    <p className="mt-1 text-sm text-slate-500">{alert.detail}</p>
                  </div>
                  <StatusPill tone={alert.severity === "warning" ? "INVITED" : "ACTIVE"}>{alert.severity}</StatusPill>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="rounded-md shadow-none">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-base">{dict.manager.dashboard.activity}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {dashboard.activity.map((item) => (
              <div key={item.id} className="border-b border-slate-200 p-5 last:border-b-0">
                <div className="flex flex-col gap-3 min-[430px]:flex-row min-[430px]:items-start min-[430px]:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-950">{item.actor}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.action} <span className="font-medium text-slate-950">{item.target}</span>
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-slate-500">{item.at}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
