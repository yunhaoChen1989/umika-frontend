import { ManagerPageHeader } from "@/components/manager/page-header";
import { OrderManager } from "@/components/manager/orders/order-manager";

export default function ManagerOrdersPage() {
  return (
    <div className="space-y-6">
      <ManagerPageHeader
        eyebrow="Operations"
        title="Orders"
        description="Search customer orders by email, review backend totals, and update fulfillment status."
      />
      <OrderManager />
    </div>
  );
}
