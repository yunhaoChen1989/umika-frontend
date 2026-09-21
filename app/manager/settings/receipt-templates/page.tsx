import { ReceiptTemplateManager } from "@/components/manager/printers/receipt-template-manager";
import { getCurrentLocale } from "@/lib/i18n-server";

export default async function ReceiptTemplatesPage() {
  return <ReceiptTemplateManager locale={await getCurrentLocale()} />;
}
