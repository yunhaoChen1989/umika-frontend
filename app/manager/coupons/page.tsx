import { CouponManager } from "@/components/manager/coupons/coupon-manager";
import { ManagerPageHeader } from "@/components/manager/page-header";

export default function ManagerCouponsPage() {
  return (
    <div className="space-y-6">
      <ManagerPageHeader
        eyebrow="Promotions"
        title="Coupons"
        description="Create and maintain backend-owned coupon rules. Checkout only applies discounts returned by the API."
      />
      <CouponManager />
    </div>
  );
}
