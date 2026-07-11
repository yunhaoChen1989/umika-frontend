export type CartItemResponse = {
  id: string;
  menuItemId: string;
  itemName: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  options: string | null;
};

export type CartResponse = {
  id: string;
  userId: string | null;
  sessionId: string | null;
  locationId: string;
  status: string;
  subtotal: number;
  items: CartItemResponse[];
  createdAt: string | null;
  updatedAt: string | null;
};

export type RedemptionPreviewResponse = {
  availablePoints?: number | null;
  requestedPoints?: number | null;
  appliedPoints?: number | null;
  maxRedeemablePoints?: number | null;
  pointValue?: number | null;
  redemptionAmount?: number | null;
  subtotal?: number | null;
  taxableAmount?: number | null;
  taxRate?: number | null;
  taxAmount?: number | null;
  tax?: number | null;
  tipAmount?: number | null;
  finalTotal?: number | null;
  total?: number | null;
  [key: string]: unknown;
};

export type CheckoutOrderItemResponse = {
  id?: string | null;
  menuItemId?: string | null;
  itemName?: string | null;
  name?: string | null;
  imageUrl?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  lineTotal?: number | null;
  totalPrice?: number | null;
  note?: string | null;
  itemNote?: string | null;
  specialInstructions?: string | null;
  options?: unknown;
  optionSnapshot?: unknown;
  [key: string]: unknown;
};

export type CheckoutResponse = {
  id?: string;
  orderId?: string;
  userId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  locationId?: string | null;
  addressId?: string | null;
  orderNumber?: string | null;
  orderType?: "PICKUP" | "DELIVERY" | "DINE_IN" | string | null;
  requestedPickupTime?: string | null;
  status?: string | null;
  subtotal?: number | null;
  totalDiscount?: number | null;
  taxRate?: number | null;
  taxAmount?: number | null;
  tax?: number | null;
  tipAmount?: number | null;
  finalTotal?: number | null;
  total?: number | null;
  customerNote?: string | null;
  pointsRedeemed?: number | null;
  rewardDiscountAmount?: number | null;
  pointsEarned?: number | null;
  items?: CheckoutOrderItemResponse[] | null;
  taxes?: unknown[] | null;
  discounts?: unknown[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  [key: string]: unknown;
};

export type StripePaymentIntentResponse = {
  clientSecret?: string | null;
  client_secret?: string | null;
  paymentIntentId?: string | null;
  payment_intent_id?: string | null;
  id?: string | null;
  publishableKey?: string | null;
  publishable_key?: string | null;
  status?: string | null;
  amount?: number | null;
  currency?: string | null;
  [key: string]: unknown;
};

export type BackendMenuItem = {
  id: string;
  categoryId: string | null;
  locationId: string | null;
  name: string;
  description: string | null;
  price: number;
  sku: string | null;
  displayOrder: number | null;
  isAvailable: boolean | null;
  isActive: boolean | null;
  isDeleted: boolean | null;
};
