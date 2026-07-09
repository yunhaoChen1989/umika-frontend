import { ManagerShell } from "@/components/manager/manager-shell";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getManagerMenus } from "@/lib/manager-api";

export default async function ManagerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getCurrentLocale();
  const menus = await getManagerMenus(locale);

  return <ManagerShell menus={menus} locale={locale}>{children}</ManagerShell>;
}
