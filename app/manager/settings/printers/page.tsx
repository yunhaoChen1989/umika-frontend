import { PrinterManager } from "@/components/manager/printers/printer-manager";
import { getCurrentLocale } from "@/lib/i18n-server";
export default async function PrintersPage() {
  return <PrinterManager locale={await getCurrentLocale()} />;
}
