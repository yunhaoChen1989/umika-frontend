import { ManagerPageHeader } from "@/components/manager/page-header";
import { OrderManager } from "@/components/manager/orders/order-manager";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";

export default async function ManagerOrdersPage() {
  const locale = await getCurrentLocale();
  const copy = getDictionary(locale).manager.pages.orders;

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />
      <OrderManager />
    </div>
  );
}
