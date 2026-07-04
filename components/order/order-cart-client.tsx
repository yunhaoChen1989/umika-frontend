"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CreditCard, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StripePaymentSection } from "@/components/order/stripe-payment-section";
import { cartIdKeyPrefix, getAuthHeaders, getOrCreateGuestSessionId, loadOrCreateCart, normalizeCart, normalizePayload, notifyCartChanged } from "@/lib/cart-client";
import type { CartResponse, CheckoutResponse, RedemptionPreviewResponse } from "@/lib/cart-types";
import type { Dictionary } from "@/lib/i18n";
import { resolveBackendMediaUrl } from "@/lib/media-url";
import { flattenMenuCatalog, type ResolvedMenuItem } from "@/lib/menu-catalog";
import type { MenuCatalogResponse } from "@/lib/menu-management-types";

export function OrderCartClient({ copy }: { copy: Dictionary }) {
  const searchParams = useSearchParams();
  const [menuItems, setMenuItems] = useState<ResolvedMenuItem[]>([]);
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [redemptionPreview, setRedemptionPreview] = useState<RedemptionPreviewResponse | null>(null);
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isTipDialogOpen, setIsTipDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [customerNote, setCustomerNote] = useState("");
  const [tipMode, setTipMode] = useState<"0" | "10" | "15" | "18" | "custom">("0");
  const [customTipAmount, setCustomTipAmount] = useState(0);
  const [orderType, setOrderType] = useState<"PICKUP" | "DELIVERY" | "DINE_IN">("PICKUP");
  const subtotal = Number(redemptionPreview?.subtotal ?? cart?.subtotal ?? 0);
  const tipAmount = calculateTipAmount(subtotal, tipMode, customTipAmount);
  const previewTipAmount = redemptionPreview?.tipAmount ?? tipAmount;
  const tax = redemptionPreview?.taxAmount ?? redemptionPreview?.tax;
  const finalTotal = redemptionPreview?.finalTotal ?? redemptionPreview?.total;
  const redemptionAmount = redemptionPreview?.redemptionAmount;
  const availablePoints = Number(redemptionPreview?.availablePoints ?? 0);
  const maxRedeemablePoints = Number(redemptionPreview?.maxRedeemablePoints ?? 0);
  const canRedeemPoints = Boolean(redemptionPreview && availablePoints > 0 && maxRedeemablePoints > 0);

  useEffect(() => {
    setSessionId(getOrCreateGuestSessionId());
  }, []);

  const loadCart = useCallback(
    async (selectedLocationId: string) => {
      const nextCart = await loadOrCreateCart(selectedLocationId, sessionId, copy.orderPage.cartError);
      setCart(nextCart);
    },
    [copy.orderPage.cartError, sessionId],
  );

  useEffect(() => {
    const locationId = searchParams.get("locationId") ?? searchParams.get("location") ?? searchParams.get("storeId") ?? searchParams.get("store");
    const locationCode = searchParams.get("locationCode") ?? searchParams.get("storeCode");
    let active = true;

    async function load() {
      if (!sessionId) {
        return;
      }

      setStatus("loading");
      setMessage(null);
      setCart(null);
      setRedemptionPreview(null);
      setCheckoutResult(null);

      const locationUrl = new URL("/api/locations/current", window.location.origin);

      if (locationId) {
        locationUrl.searchParams.set("locationId", locationId);
      }

      if (locationCode) {
        locationUrl.searchParams.set("locationCode", locationCode);
      }

      const locationResponse = await fetch(locationUrl.toString(), {
        headers: getAuthHeaders(),
        cache: "no-store",
      }).catch(() => null);

      if (!locationResponse?.ok) {
        setStatus("error");
        setMessage(copy.orderPage.locationRequired);
        return;
      }

      const location = (await locationResponse.json()) as { id?: string; locationId?: string };
      const nextLocationId = location.id ?? location.locationId ?? "";

      if (!nextLocationId) {
        setStatus("error");
        setMessage(copy.orderPage.locationRequired);
        return;
      }

      setSelectedLocationId(nextLocationId);

      const catalogUrl = new URL("/api/menu-catalog", window.location.origin);
      catalogUrl.searchParams.set("locationId", nextLocationId);

      const menuResponse = await fetch(catalogUrl.toString(), {
        headers: getAuthHeaders(),
        cache: "no-store",
      }).catch(() => null);

      if (menuResponse?.ok) {
        setMenuItems(flattenMenuCatalog((await menuResponse.json()) as MenuCatalogResponse));
      } else {
        const body = menuResponse ? await menuResponse.json().catch(() => null) : null;
        setMessage(resolveErrorMessage(body, copy.menuPage.loadError));
      }

      if (!active) {
        return;
      }

      await loadCart(nextLocationId);

      if (!active) {
        return;
      }

      setStatus("ready");
    }

    void load().catch((error: unknown) => {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : copy.orderPage.cartError);
    });
    return () => {
      active = false;
    };
  }, [copy.menuPage.loadError, copy.orderPage.cartError, copy.orderPage.locationRequired, loadCart, searchParams, sessionId]);

  useEffect(() => {
    if (!cart?.items.length) {
      setRedemptionPreview(null);
      return;
    }

    const timeout = window.setTimeout(() => {
      void previewRedemption();
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart?.id, cart?.subtotal, cart?.items.length, pointsToRedeem, tipAmount]);

  useEffect(() => {
    if (!redemptionPreview) {
      return;
    }

    const availablePoints = Number(redemptionPreview.availablePoints ?? 0);
    const maxRedeemablePoints = Number(redemptionPreview.maxRedeemablePoints ?? 0);

    if ((availablePoints <= 0 || maxRedeemablePoints <= 0) && pointsToRedeem !== 0) {
      setPointsToRedeem(0);
    }
  }, [pointsToRedeem, redemptionPreview]);

  async function addItem(menuItemId: string) {
    if (!cart) {
      return;
    }

    setPendingId(menuItemId);
    setMessage(null);

    const headers = getAuthHeaders();
    headers.set("Content-Type", "application/json");

    const response = await fetch(`/api/cart/${cart.id}/items?sessionId=${encodeURIComponent(sessionId)}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        locationId: selectedLocationId,
        menuItemId,
        quantity: 1,
        optionIds: [],
        note: null,
      }),
      cache: "no-store",
    }).catch(() => null);

    setPendingId(null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setMessage(typeof body?.message === "string" ? body.message : copy.orderPage.cartError);
      return;
    }

    const nextCart = normalizeCart(await response.json().catch(() => null));

    if (nextCart) {
      setCart(nextCart);
      notifyCartChanged();
    }
  }

  async function setQuantity(itemId: string, quantity: number) {
    if (!cart) {
      return;
    }

    if (quantity <= 0) {
      await removeItem(itemId);
      return;
    }

    setPendingId(itemId);
    const headers = getAuthHeaders();
    headers.set("Content-Type", "application/json");

    const response = await fetch(`/api/cart/${cart.id}/items/${itemId}?sessionId=${encodeURIComponent(sessionId)}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ quantity }),
      cache: "no-store",
    }).catch(() => null);

    setPendingId(null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setMessage(resolveErrorMessage(body, copy.orderPage.cartError));
      return;
    }

    const nextCart = normalizeCart(await response.json().catch(() => null));

    if (nextCart) {
      setCart(nextCart);
      notifyCartChanged();
    }
  }

  async function removeItem(itemId: string) {
    if (!cart) {
      return;
    }

    setPendingId(itemId);
    const response = await fetch(`/api/cart/${cart.id}/items/${itemId}?sessionId=${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
      cache: "no-store",
    }).catch(() => null);

    setPendingId(null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setMessage(resolveErrorMessage(body, copy.orderPage.cartError));
      return;
    }

    const nextCart = normalizeCart(await response.json().catch(() => null));

    if (nextCart) {
      setCart(nextCart);
      notifyCartChanged();
    }
  }

  async function previewRedemption() {
    if (!cart?.id) {
      return null;
    }

    const headers = getAuthHeaders();
    headers.set("Content-Type", "application/json");

    const response = await fetch("/api/orders/redemption-preview", {
      method: "POST",
      headers,
      body: JSON.stringify({
        cartId: cart.id,
        pointsToRedeem,
        tipAmount,
      }),
      cache: "no-store",
    }).catch(() => null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setMessage(resolveErrorMessage(body, copy.orderPage.previewError));
      setRedemptionPreview(null);
      return null;
    }

    const preview = normalizePayload<RedemptionPreviewResponse>(await response.json().catch(() => null));
    setRedemptionPreview(preview);
    return preview;
  }

  async function checkout() {
    if (!cart?.id) {
      return;
    }

    setIsCheckingOut(true);
    setMessage(null);
    setCheckoutResult(null);

    const preview = await previewRedemption();

    if (!preview) {
      setIsCheckingOut(false);
      return;
    }

    const headers = getAuthHeaders();
    headers.set("Content-Type", "application/json");

    const response = await fetch("/api/orders/checkout", {
      method: "POST",
      headers,
      body: JSON.stringify({
        cartId: cart.id,
        orderType,
        addressId: null,
        customerNote: customerNote.trim() || null,
        pointsToRedeem: canRedeemPoints ? pointsToRedeem : 0,
        tipAmount,
      }),
      cache: "no-store",
    }).catch(() => null);

    setIsCheckingOut(false);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setMessage(resolveErrorMessage(body, copy.orderPage.checkoutError));
      return;
    }

    const order = normalizePayload<CheckoutResponse>(await response.json().catch(() => null));
    setCheckoutResult(order);
    setIsTipDialogOpen(false);
    setIsPaymentDialogOpen(true);
    setCart(null);

    if (selectedLocationId) {
      localStorage.removeItem(`${cartIdKeyPrefix}:${selectedLocationId}`);
      await loadCart(selectedLocationId).catch(() => null);
      notifyCartChanged();
    }
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_400px] lg:px-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">{copy.orderPage.eyebrow}</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight sm:text-5xl">{copy.orderPage.title}</h1>
        {message ? (
          <p className="mt-5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {message}
          </p>
        ) : null}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {status === "loading" ? (
            <p className="text-sm text-muted-foreground">{copy.orderPage.loading}</p>
          ) : menuItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">{copy.orderPage.noMenuItems}</p>
          ) : (
            menuItems.slice(0, 12).map((item) => (
              <Card key={item.id} className="flex flex-col">
                <div className="aspect-[4/3] overflow-hidden rounded-t-md bg-muted">
                  <img
                    alt={item.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    src={resolveBackendMediaUrl(item.imageUrl) || "/images/umika-hero.png"}
                  />
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle>{item.name}</CardTitle>
                    <span className="font-semibold">${Number(item.price ?? 0).toFixed(2)}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                  <Button className="mt-5 w-full" disabled={!cart || pendingId === item.id} onClick={() => void addItem(item.id)} type="button">
                    <Plus className="h-4 w-4" />
                    {copy.orderPage.addToCart}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
      <aside className="h-fit rounded-lg border bg-card p-5 shadow-soft lg:sticky lg:top-24">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{copy.orderPage.cart}</h2>
          <Badge>
            <ShoppingBag className="mr-1 h-3.5 w-3.5" />
            {cart?.items.length ?? 0} {copy.orderPage.items}
          </Badge>
        </div>
        {message ? (
          <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {message}
          </p>
        ) : null}
        <div className="mt-5 space-y-4">
          {cart?.items.length ? (
            cart.items.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 border-b pb-4 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{item.itemName}</p>
                  <p className="text-sm text-muted-foreground">${Number(item.unitPrice).toFixed(2)} {copy.common.priceEach}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button disabled={pendingId === item.id} size="icon" variant="outline" aria-label={`${copy.orderPage.removeOne} ${item.itemName}`} onClick={() => void setQuantity(item.id, item.quantity - 1)}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                  <Button disabled={pendingId === item.id} size="icon" variant="outline" aria-label={`${copy.orderPage.addOne} ${item.itemName}`} onClick={() => void setQuantity(item.id, item.quantity + 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button disabled={pendingId === item.id} size="icon" variant="outline" aria-label={`${copy.orderPage.removeItem} ${item.itemName}`} onClick={() => void removeItem(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">{copy.orderPage.emptyCart}</p>
          )}
        </div>
        <div className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{copy.orderPage.subtotal}</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <label className="block pt-2 text-sm font-medium">
            {copy.orderPage.orderType}
            <select
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              onChange={(event) => setOrderType(event.target.value as "PICKUP" | "DELIVERY" | "DINE_IN")}
              value={orderType}
            >
              <option value="PICKUP">{copy.orderPage.pickup}</option>
              <option value="DELIVERY">{copy.orderPage.delivery}</option>
              <option value="DINE_IN">{copy.orderPage.dineIn}</option>
            </select>
          </label>
          {canRedeemPoints && redemptionPreview ? (
            <label className="block pt-2 text-sm font-medium">
              {copy.orderPage.pointsToRedeem}
              <input
                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                max={maxRedeemablePoints}
                min={0}
                onChange={(event) => setPointsToRedeem(Math.max(0, Math.min(maxRedeemablePoints, Number(event.target.value) || 0)))}
                step={1}
                type="number"
                value={pointsToRedeem}
              />
            </label>
          ) : null}
          <label className="block pt-2 text-sm font-medium">
            {copy.orderPage.customerNote}
            <textarea
              className="mt-2 min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              onChange={(event) => setCustomerNote(event.target.value)}
              placeholder={copy.orderPage.customerNotePlaceholder}
              value={customerNote}
            />
          </label>
          {canRedeemPoints && redemptionPreview ? (
            <div className="space-y-2 border-t pt-3">
              <PreviewRow label={copy.orderPage.availablePoints} value={formatPoints(redemptionPreview.availablePoints)} />
              <PreviewRow label={copy.orderPage.appliedPoints} value={formatPoints(redemptionPreview.appliedPoints)} />
              <PreviewRow label={copy.orderPage.maxRedeemablePoints} value={formatPoints(redemptionPreview.maxRedeemablePoints)} />
              <PreviewRow label={copy.orderPage.redemptionAmount} value={formatMoney(redemptionAmount)} />
            </div>
          ) : null}
          {redemptionPreview ? (
            <div className="space-y-2 border-t pt-3">
              <PreviewRow label={copy.orderPage.taxableAmount} value={formatMoney(redemptionPreview.taxableAmount)} />
              <PreviewRow label={copy.orderPage.taxRate} value={formatPercent(redemptionPreview.taxRate)} />
            </div>
          ) : null}
          <div className="flex justify-between">
            <span className="text-muted-foreground">{copy.orderPage.redemptionAmount}</span>
            <span>{formatMoney(redemptionAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{copy.orderPage.tax}</span>
            <span>{formatMoney(tax)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{copy.orderPage.tipAmount}</span>
            <span>{formatMoney(previewTipAmount)}</span>
          </div>
          <div className="flex justify-between border-t pt-3 text-base font-semibold">
            <span>{copy.orderPage.finalTotal}</span>
            <span>{formatMoney(finalTotal)}</span>
          </div>
        </div>
        {checkoutResult ? (
          <>
            <OrderReview order={checkoutResult} copy={copy} />
            <Button className="mt-4 w-full" onClick={() => setIsPaymentDialogOpen(true)} type="button" variant="outline">
              <CreditCard className="h-4 w-4" />
              {copy.orderPage.paymentTitle}
            </Button>
          </>
        ) : null}
        <Button className="mt-6 w-full whitespace-normal" disabled={!cart?.items.length || isCheckingOut} size="lg" onClick={() => setIsTipDialogOpen(true)} type="button">
          <CreditCard className="h-4 w-4" />
          {copy.orderPage.checkout}
        </Button>
      </aside>
      <Dialog open={isTipDialogOpen} onOpenChange={setIsTipDialogOpen}>
        <DialogContent className="w-[min(96vw,30rem)]">
          <DialogHeader>
            <DialogTitle>{copy.orderPage.tip}</DialogTitle>
            <DialogDescription>{copy.orderPage.tipDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 p-5">
            {message ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {message}
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["0", "10", "15", "18"] as const).map((value) => (
                <Button
                  className="h-11 px-2 text-sm"
                  key={value}
                  onClick={() => setTipMode(value)}
                  type="button"
                  variant={tipMode === value ? "default" : "outline"}
                >
                  {value === "0" ? copy.orderPage.noTip : `${value}%`}
                </Button>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
              <Button
                className="h-11 px-2 text-sm"
                onClick={() => setTipMode("custom")}
                type="button"
                variant={tipMode === "custom" ? "default" : "outline"}
              >
                {copy.orderPage.customTip}
              </Button>
              <input
                aria-label={copy.orderPage.customTip}
                className="h-11 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                disabled={tipMode !== "custom"}
                min={0}
                onChange={(event) => setCustomTipAmount(roundMoney(Math.max(0, Number(event.target.value) || 0)))}
                step="0.01"
                type="number"
                value={customTipAmount}
              />
            </div>
            <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
              <PreviewRow label={copy.orderPage.subtotal} value={formatMoney(subtotal)} />
              <PreviewRow label={copy.orderPage.redemptionAmount} value={formatMoney(redemptionAmount)} />
              <PreviewRow label={copy.orderPage.tax} value={formatMoney(tax)} />
              <PreviewRow label={copy.orderPage.tipAmount} value={formatMoney(previewTipAmount)} />
              <div className="border-t pt-2">
                <PreviewRow label={copy.orderPage.finalTotal} value={formatMoney(finalTotal)} />
              </div>
            </div>
          </div>
          <DialogFooter className="justify-end">
            <Button type="button" variant="outline" onClick={() => setIsTipDialogOpen(false)}>
              {copy.common.cancel}
            </Button>
            <Button disabled={!cart?.items.length || isCheckingOut} onClick={() => void checkout()} type="button">
              <CreditCard className="h-4 w-4" />
              {copy.orderPage.confirmOrder}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="w-[min(96vw,38rem)]">
          <DialogHeader>
            <DialogTitle>{copy.orderPage.paymentTitle}</DialogTitle>
            <DialogDescription>{copy.orderPage.paymentNext}</DialogDescription>
          </DialogHeader>
          <div className="p-5 pt-0">
            {checkoutResult ? (
              <>
                <OrderReview order={checkoutResult} copy={copy} />
                <StripePaymentSection
                  order={checkoutResult}
                  copy={copy}
                  onClose={() => setIsPaymentDialogOpen(false)}
                  onPaid={(paidOrder) => {
                    setCheckoutResult((currentOrder) => {
                      if (!currentOrder) {
                        return paidOrder ?? currentOrder;
                      }

                      return { ...currentOrder, ...paidOrder, status: paidOrder?.status ?? "PAID" };
                    });
                  }}
                />
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function OrderReview({ order, copy }: { order: CheckoutResponse; copy: Dictionary }) {
  const items = order.items ?? [];
  const orderId = order.orderNumber ?? order.id ?? order.orderId;

  return (
    <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
      <p className="font-semibold">{copy.orderPage.checkoutReady}</p>
      <div className="mt-3 space-y-2">
        {orderId ? <PreviewRow label={copy.orderPage.orderNumber} value={String(orderId)} /> : null}
        {order.status ? <PreviewRow label={copy.orderPage.orderStatus} value={order.status} /> : null}
        {order.orderType ? <PreviewRow label={copy.orderPage.orderType} value={formatOrderType(order.orderType, copy)} /> : null}
        {order.customerNote ? <PreviewRow label={copy.orderPage.customerNote} value={order.customerNote} /> : null}
        <PreviewRow label={copy.orderPage.subtotal} value={formatMoney(order.subtotal)} />
        <PreviewRow label={copy.orderPage.totalDiscount} value={formatMoney(order.totalDiscount)} />
        <PreviewRow label={copy.orderPage.redemptionAmount} value={formatMoney(order.rewardDiscountAmount)} />
        {typeof order.tipAmount === "number" ? <PreviewRow label={copy.orderPage.tipAmount} value={formatMoney(order.tipAmount)} /> : null}
        <PreviewRow label={copy.orderPage.taxRate} value={formatPercent(order.taxRate)} />
        <PreviewRow label={copy.orderPage.tax} value={formatMoney(order.taxAmount ?? order.tax)} />
        <PreviewRow label={copy.orderPage.finalTotal} value={formatMoney(order.finalTotal ?? order.total)} />
        <PreviewRow label={copy.orderPage.pointsRedeemed} value={formatPoints(order.pointsRedeemed)} />
        <PreviewRow label={copy.orderPage.pointsEarned} value={formatPoints(order.pointsEarned)} />
      </div>
      {items.length ? (
        <div className="mt-4 border-t border-emerald-200 pt-3">
          <p className="font-semibold">{copy.orderPage.items}</p>
          <div className="mt-2 space-y-2">
            {items.map((item, index) => {
              const name = item.itemName ?? item.name ?? item.menuItemId ?? `Item ${index + 1}`;
              return (
                <div key={item.id ?? `${name}-${index}`} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate">
                    {name} x {item.quantity ?? 1}
                  </span>
                  <span>{formatMoney(item.lineTotal)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      <p className="mt-4 text-xs text-emerald-800">{copy.orderPage.paymentNext}</p>
    </div>
  );
}

function resolveErrorMessage(body: unknown, fallback: string) {
  if (body && typeof body === "object") {
    if ("message" in body && typeof body.message === "string") {
      return body.message;
    }

    if ("error" in body && body.error && typeof body.error === "object" && "message" in body.error && typeof body.error.message === "string") {
      return body.error.message;
    }
  }

  return fallback;
}

function formatMoney(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `$${value.toFixed(2)}` : "--";
}

function formatPoints(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "--";
}

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(2)}%` : "--";
}

function formatOrderType(value: string, copy: Dictionary) {
  if (value === "PICKUP") {
    return copy.orderPage.pickup;
  }

  if (value === "DELIVERY") {
    return copy.orderPage.delivery;
  }

  if (value === "DINE_IN") {
    return copy.orderPage.dineIn;
  }

  return value;
}

function calculateTipAmount(subtotal: number, tipMode: "0" | "10" | "15" | "18" | "custom", customTipAmount: number) {
  if (tipMode === "custom") {
    return roundMoney(customTipAmount);
  }

  const percent = Number(tipMode);
  return roundMoney((subtotal * percent) / 100);
}

function roundMoney(value: number) {
  return Number.isFinite(value) ? Math.round(Math.max(0, value) * 100) / 100 : 0;
}
