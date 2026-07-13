export type CouponDiscountType = "PERCENT" | "FIXED_AMOUNT";

export type Coupon = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  minimumOrderAmount: number | null;
  maximumDiscountAmount: number | null;
  locationId: string | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimitTotal: number | null;
  usageLimitPerUser: number | null;
  firstOrderOnly: boolean | null;
  newCustomerOnly: boolean | null;
  isActive: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CouponPayload = {
  code: string;
  name: string;
  description: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  minimumOrderAmount: number | null;
  maximumDiscountAmount: number | null;
  locationId: string | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimitTotal: number | null;
  usageLimitPerUser: number | null;
  firstOrderOnly: boolean;
  newCustomerOnly: boolean;
  isActive: boolean;
};
