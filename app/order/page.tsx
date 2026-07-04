import { OrderHistoryPanel } from "@/components/account/order-history";
import { OrderCartClient } from "@/components/order/order-cart-client";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";

export default async function OrderPage() {
  const locale = await getCurrentLocale();
  const dict = getDictionary(locale);

  return (
    <>
      <OrderCartClient copy={dict} />
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <OrderHistoryPanel copy={dict.accountPage} paymentCopy={dict} />
      </section>
    </>
  );
}
