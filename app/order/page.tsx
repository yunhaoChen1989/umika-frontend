import { CreditCard, Minus, Plus, ShoppingBag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getLocalizedMenuItems } from "@/lib/localized-data";

export default async function OrderPage() {
  const locale = await getCurrentLocale();
  const dict = getDictionary(locale);
  const menuItems = getLocalizedMenuItems(locale);
  const cartItems = [
    { item: menuItems[0], quantity: 1 },
    { item: menuItems[2], quantity: 2 },
  ];
  const subtotal = cartItems.reduce((sum, line) => sum + line.item.price * line.quantity, 0);
  const tax = subtotal * 0.13;
  const total = subtotal + tax;

  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_400px] lg:px-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">{dict.orderPage.eyebrow}</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight sm:text-5xl">{dict.orderPage.title}</h1>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {menuItems.slice(0, 4).map((item) => (
            <Card key={item.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <CardTitle>{item.name}</CardTitle>
                  <span className="font-semibold">${item.price}</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                <Button className="mt-5 w-full">
                  <Plus className="h-4 w-4" />
                  {dict.orderPage.addToCart}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <aside className="h-fit rounded-lg border bg-card p-5 shadow-soft lg:sticky lg:top-24">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{dict.orderPage.cart}</h2>
          <Badge>
            <ShoppingBag className="mr-1 h-3.5 w-3.5" />
            {cartItems.length} {dict.orderPage.items}
          </Badge>
        </div>
        <div className="mt-5 space-y-4">
          {cartItems.map(({ item, quantity }) => (
            <div key={item.id} className="flex flex-col gap-3 border-b pb-4 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
              <div className="min-w-0">
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">${item.price} {dict.common.priceEach}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" aria-label={`${dict.orderPage.removeOne} ${item.name}`}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-6 text-center text-sm font-semibold">{quantity}</span>
                <Button size="icon" variant="outline" aria-label={`${dict.orderPage.addOne} ${item.name}`}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{dict.orderPage.subtotal}</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{dict.orderPage.tax}</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t pt-3 text-base font-semibold">
            <span>{dict.orderPage.total}</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
        <Button className="mt-6 w-full whitespace-normal" size="lg">
          <CreditCard className="h-4 w-4" />
          {dict.orderPage.checkout}
        </Button>
      </aside>
    </section>
  );
}
