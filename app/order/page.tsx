import { OrderCartClient } from "@/components/order/order-cart-client";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";

export default async function OrderPage() {
  const locale = await getCurrentLocale();
  const dict = getDictionary(locale);

  return <OrderCartClient copy={dict} />;
}
