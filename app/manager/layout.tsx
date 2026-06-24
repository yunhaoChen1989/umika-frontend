import { ManagerShell } from "@/components/manager/manager-shell";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getLocalizedManagerMenus } from "@/lib/localized-data";

export default async function ManagerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getCurrentLocale();
  const menus = getLocalizedManagerMenus(locale);

  return <ManagerShell menus={menus} locale={locale}>{children}</ManagerShell>;
}
