import { ManagerShell } from "@/components/manager/manager-shell";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getManagerMenus } from "@/lib/manager-api";
import { getLocalizedManagerMenus } from "@/lib/localized-data";

export default async function ManagerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getCurrentLocale();
  const backendMenus = await getManagerMenus();
  const menus = getLocalizedManagerMenus(locale, backendMenus);

  return <ManagerShell menus={menus} locale={locale}>{children}</ManagerShell>;
}
