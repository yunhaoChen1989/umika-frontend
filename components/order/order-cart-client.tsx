"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CreditCard, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StripePaymentSection } from "@/components/order/stripe-payment-section";
import { cartIdKeyPrefix, getAuthHeaders, getOrCreateGuestSessionId, loadOrCreateCart, normalizeCart, normalizePayload, notifyCartChanged } from "@/lib/cart-client";
import { formatCartOptions } from "@/lib/cart-options";
import type { CartResponse, CheckoutResponse, RedemptionPreviewResponse } from "@/lib/cart-types";
import { getLoginRedirectHref } from "@/lib/auth-redirect";
import type { Dictionary, Locale } from "@/lib/i18n";
import { resolveBackendMediaUrl } from "@/lib/media-url";
import { flattenMenuCatalog, type ResolvedMenuItem } from "@/lib/menu-catalog";
import { loadMenuItemDetail } from "@/lib/menu-item-detail-client";
import type { MenuCatalogResponse } from "@/lib/menu-management-types";

type CouponApplyResponse = Partial<CartResponse> & {
  cartId?: string | null;
  couponId?: string | null;
  coupon_id?: string | null;
  couponCode?: string | null;
  coupon_code?: string | null;
  couponDiscount?: number | null;
  coupon_discount?: number | null;
  taxableAmount?: number | null;
  message?: string | null;
};

export function OrderCartClient({ copy, locale }: { copy: Dictionary; locale: Locale }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [menuItems, setMenuItems] = useState<ResolvedMenuItem[]>([]);
  const [catalogItems, setCatalogItems] = useState<ResolvedMenuItem[]>([]);
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
  const [couponCode, setCouponCode] = useState("");
  const [couponPending, setCouponPending] = useState(false);
  const [tipMode, setTipMode] = useState<"0" | "10" | "15" | "18" | "custom">("0");
  const [customTipAmount, setCustomTipAmount] = useState(0);
  const [orderType, setOrderType] = useState<"PICKUP" | "DELIVERY" | "DINE_IN">("PICKUP");
  const [requestedPickupTime, setRequestedPickupTime] = useState("");
  const [selectedItem, setSelectedItem] = useState<ResolvedMenuItem | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemNote, setItemNote] = useState("");
  const [isImageZoomed, setIsImageZoomed] = useState(false);
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

      const frequentItemsUrl = new URL("/api/me/frequent-menu-items", window.location.origin);
      frequentItemsUrl.searchParams.set("limit", "4");
      frequentItemsUrl.searchParams.set("locationId", nextLocationId);
      const catalogUrl = new URL("/api/menu-catalog", window.location.origin);
      catalogUrl.searchParams.set("locationId", nextLocationId);

      const [menuResponse, catalogResponse] = await Promise.all([
        fetch(frequentItemsUrl.toString(), {
          headers: getAuthHeaders(),
          cache: "no-store",
        }).catch(() => null),
        fetch(catalogUrl.toString(), {
          method: "GET",
          headers: getAuthHeaders(),
          cache: "no-store",
        }).catch(() => null),
      ]);

      const nextCatalogItems = catalogResponse?.ok
        ? flattenMenuCatalog((await catalogResponse.json().catch(() => null)) as MenuCatalogResponse | null, locale)
        : [];
      setCatalogItems(nextCatalogItems);

      if (menuResponse?.ok) {
        setMenuItems(normalizeFrequentMenuItems(await menuResponse.json().catch(() => null), copy.menuPage.itemFallback));
      } else if (menuResponse?.status === 401 || menuResponse?.status === 403) {
        setMenuItems(nextCatalogItems.slice(0, 4));
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
  }, [copy.menuPage.itemFallback, copy.menuPage.loadError, copy.orderPage.cartError, copy.orderPage.locationRequired, loadCart, locale, searchParams, sessionId]);

  useEffect(() => {
    if (!cart?.items.length) {
      setRedemptionPreview(null);
      return;
    }

    if (!localStorage.getItem("umika_access_token")) {
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
  }, [cart?.id, cart?.subtotal, cart?.items.length, cart?.couponCode, cart?.couponDiscount, pointsToRedeem, tipAmount]);

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

  async function openItem(item: ResolvedMenuItem) {
    const resolvedItem = catalogItems.find((catalogItem) => catalogItem.id === item.id) ?? item;
    setSelectedItem(resolvedItem);
    setSelectedOptionIds([]);
    setItemQuantity(1);
    setItemNote("");
    setIsImageZoomed(false);
    setMessage(null);

    const detailItem = await loadMenuItemDetail(resolvedItem, locale);
    setSelectedItem((current) => (current?.id === resolvedItem.id ? detailItem : current));
  }

  function toggleOption(optionId: string) {
    setSelectedOptionIds((current) => (current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]));
  }

  async function addItem(menuItemId: string, quantity = 1, optionIds: string[] = [], note = "") {
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
        quantity,
        optionIds,
        note: note.trim() || null,
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
      setSelectedItem(null);
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

  async function applyCoupon() {
    if (!cart?.id) {
      return;
    }

    const normalizedCoupon = couponCode.trim();
    if (!normalizedCoupon) {
      setMessage(copy.orderPage.enterCoupon);
      return;
    }

    setCouponPending(true);
    setMessage(null);

    const headers = getAuthHeaders();
    headers.set("Content-Type", "application/json");

    const response = await fetch(`/api/cart/${cart.id}/coupon?sessionId=${encodeURIComponent(sessionId)}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ couponCode: normalizedCoupon }),
      cache: "no-store",
    }).catch(() => null);

    setCouponPending(false);

    const body = response ? await response.json().catch(() => null) : null;

    if (!response?.ok) {
      setMessage(resolveErrorMessage(body, copy.orderPage.applyCouponError));
      return;
    }

    const payload = normalizePayload<CouponApplyResponse>(body);
    if (payload) {
      setCart((current) => mergeCouponCart(current, payload));
      setCouponCode("");
      setMessage(payload.message ?? copy.orderPage.couponApplied);
      notifyCartChanged();
    }
  }

  async function removeCoupon() {
    if (!cart?.id) {
      return;
    }

    setCouponPending(true);
    setMessage(null);

    const response = await fetch(`/api/cart/${cart.id}/coupon?sessionId=${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
      cache: "no-store",
    }).catch(() => null);

    setCouponPending(false);

    const body = response ? await response.json().catch(() => null) : null;

    if (!response?.ok) {
      setMessage(resolveErrorMessage(body, copy.orderPage.removeCouponError));
      return;
    }

    const payload = normalizePayload<Partial<CartResponse>>(body);
    if (payload && (payload.id || payload.items)) {
      setCart((current) => current ? { ...current, ...payload } : normalizeCart(payload));
    } else if (selectedLocationId) {
      await loadCart(selectedLocationId).catch(() => null);
    } else {
      setCart((current) => current ? { ...current, couponId: null, couponCode: null, couponDiscount: null } : current);
    }
    setMessage(copy.orderPage.couponRemoved);
    notifyCartChanged();
  }

  async function previewRedemption({ redirectOnAuthError = false }: { redirectOnAuthError?: boolean } = {}) {
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

      if (response?.status === 401 || response?.status === 403) {
        setRedemptionPreview(null);

        if (redirectOnAuthError) {
          window.location.assign(getLoginRedirectHref(getCurrentPath(pathname, searchParams)));
        }

        return null;
      }

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

    if (!localStorage.getItem("umika_access_token")) {
      window.location.assign(getLoginRedirectHref(getCurrentPath(pathname, searchParams)));
      return;
    }

    setIsCheckingOut(true);
    setMessage(null);
    setCheckoutResult(null);

    const preview = await previewRedemption({ redirectOnAuthError: true });

    if (!preview) {
      setIsCheckingOut(false);
      return;
    }

    const headers = getAuthHeaders();
    headers.set("Content-Type", "application/json");
    const checkoutPayload: {
      cartId: string;
      orderType: "PICKUP" | "DELIVERY" | "DINE_IN";
      addressId: null;
      customerNote: string | null;
      pointsToRedeem: number;
      tipAmount: number;
      requestedPickupTime?: string | null;
    } = {
      cartId: cart.id,
      orderType,
      addressId: null,
      customerNote: customerNote.trim() || null,
      pointsToRedeem: canRedeemPoints ? pointsToRedeem : 0,
      tipAmount,
    };

    if (orderType === "PICKUP") {
      const normalizedPickupTime = normalizeRequestedPickupTime(requestedPickupTime);

      if (normalizedPickupTime) {
        checkoutPayload.requestedPickupTime = normalizedPickupTime;
      }
    } else {
      checkoutPayload.requestedPickupTime = null;
    }

    const response = await fetch("/api/orders/checkout", {
      method: "POST",
      headers,
      body: JSON.stringify(checkoutPayload),
      cache: "no-store",
    }).catch(() => null);

    setIsCheckingOut(false);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;

      if (response?.status === 401 || response?.status === 403) {
        window.location.assign(getLoginRedirectHref(getCurrentPath(pathname, searchParams)));
        return;
      }

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

  async function startCheckout() {
    if (!localStorage.getItem("umika_access_token")) {
      window.location.assign(getLoginRedirectHref(getCurrentPath(pathname, searchParams)));
      return;
    }

    setMessage(null);
    setIsCheckingOut(true);

    const response = await fetch("/api/me/profile", {
      method: "GET",
      headers: getAuthHeaders(),
      cache: "no-store",
    }).catch(() => null);

    setIsCheckingOut(false);

    if (response?.status === 401 || response?.status === 403) {
      localStorage.removeItem("umika_access_token");
      localStorage.removeItem("umika_token_type");
      window.dispatchEvent(new Event("umika-auth-changed"));
      window.location.assign(getLoginRedirectHref(getCurrentPath(pathname, searchParams)));
      return;
    }

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setMessage(resolveErrorMessage(body, copy.orderPage.checkoutError));
      return;
    }

    setIsTipDialogOpen(true);
  }

  function resetOrderPageState() {
    setMessage(null);
    setPendingId(null);
    setPointsToRedeem(0);
    setCustomerNote("");
    setTipMode("0");
    setCustomTipAmount(0);
    setRequestedPickupTime("");
    setOrderType("PICKUP");
    setRedemptionPreview(null);

    if (selectedLocationId) {
      void loadCart(selectedLocationId).then(() => notifyCartChanged()).catch(() => null);
    }
  }

  function closePaymentDialog() {
    setIsPaymentDialogOpen(false);

    if (isPaidOrderStatus(checkoutResult?.status)) {
      setCheckoutResult(null);
      resetOrderPageState();
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
            menuItems.map((item) => (
              <Card key={item.id} className="flex flex-col">
                <button className="aspect-[4/3] overflow-hidden rounded-t-md bg-muted text-left" onClick={() => void openItem(item)} type="button">
                  <img
                    alt={item.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    src={resolveBackendMediaUrl(item.imageUrl) || "/images/umika-hero.png"}
                  />
                </button>
                <CardHeader>
                  <button className="flex w-full items-start justify-between gap-4 text-left" onClick={() => void openItem(item)} type="button">
                    <CardTitle>{item.name}</CardTitle>
                    <span className="font-semibold">${Number(item.price ?? 0).toFixed(2)}</span>
                  </button>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                  <Button className="mt-5 w-full" disabled={!cart || pendingId === item.id || item.isAvailable === false} onClick={() => void openItem(item)} type="button">
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
            cart.items.map((item) => {
              const itemOptions = formatCartOptions(item.options);

              return (
              <div key={item.id} className="flex flex-col gap-3 border-b pb-4">
                <div className="flex gap-3">
                  {item.imageUrl ? (
                    <img alt={item.itemName} className="h-16 w-16 shrink-0 rounded-md bg-muted object-cover" src={resolveBackendMediaUrl(item.imageUrl)} />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.itemName}</p>
                    <p className="text-sm text-muted-foreground">${Number(item.unitPrice).toFixed(2)} {copy.common.priceEach}</p>
                    {itemOptions.optionText ? <p className="mt-1 text-xs text-muted-foreground">{itemOptions.optionText}</p> : null}
                    {itemOptions.note ? <p className="mt-1 text-xs text-muted-foreground">{copy.menuPage.specialInstructions}: {itemOptions.note}</p> : null}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
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
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">{copy.orderPage.emptyCart}</p>
          )}
        </div>
        <div className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{copy.orderPage.subtotal}</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="space-y-2 border-t pt-3">
            <label className="block text-sm font-medium">
              {copy.orderPage.coupon}
              <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm uppercase outline-none focus:ring-2 focus:ring-ring"
                  disabled={couponPending || Boolean(cart?.couponCode)}
                  onChange={(event) => setCouponCode(event.target.value)}
                  aria-label={copy.orderPage.couponPlaceholder}
                  placeholder="WELCOME10"
                  value={couponCode}
                />
                {cart?.couponCode ? (
                  <Button type="button" variant="outline" disabled={couponPending} onClick={() => void removeCoupon()}>
                    {copy.orderPage.removeCoupon}
                  </Button>
                ) : (
                  <Button type="button" disabled={couponPending || !cart?.items.length} onClick={() => void applyCoupon()}>
                    {couponPending ? copy.orderPage.applyingCoupon : copy.orderPage.applyCoupon}
                  </Button>
                )}
              </div>
            </label>
            {cart?.couponCode ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{cart.couponCode}</span>
                  <span>{formatDiscountAmount(cart.couponDiscount)}</span>
                </div>
              </div>
            ) : null}
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
          {orderType === "PICKUP" ? (
            <label className="block pt-2 text-sm font-medium">
              {copy.orderPage.requestedPickupTime}
              <input
                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                onChange={(event) => setRequestedPickupTime(event.target.value)}
                type="datetime-local"
                value={requestedPickupTime}
              />
              <span className="mt-1 block text-xs font-normal text-muted-foreground">
                {copy.orderPage.pickupTimeHelp}
              </span>
            </label>
          ) : null}
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
          {cart?.couponCode || Number(cart?.couponDiscount ?? 0) > 0 ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{copy.orderPage.couponDiscount}</span>
              <span>{formatDiscountAmount(cart?.couponDiscount)}</span>
            </div>
          ) : null}
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
        {checkoutResult && !isPaidOrderStatus(checkoutResult.status) ? (
          <>
            <OrderReview order={checkoutResult} copy={copy} />
            <Button className="mt-4 w-full" onClick={() => setIsPaymentDialogOpen(true)} type="button" variant="outline">
              <CreditCard className="h-4 w-4" />
              {copy.orderPage.paymentTitle}
            </Button>
          </>
        ) : null}
        <Button className="mt-6 w-full whitespace-normal" disabled={!cart?.items.length || isCheckingOut} size="lg" onClick={() => void startCheckout()} type="button">
          <CreditCard className="h-4 w-4" />
          {copy.orderPage.checkout}
        </Button>
      </aside>
      <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="w-[min(96vw,54rem)]">
          {selectedItem ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedItem.name}</DialogTitle>
                <DialogDescription>{copy.menuPage.details}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <button
                  className={isImageZoomed ? "fixed inset-0 z-[60] flex cursor-zoom-out items-center justify-center bg-black/80 p-4" : "group text-left"}
                  onClick={() => setIsImageZoomed((current) => !current)}
                  type="button"
                >
                  <img
                    alt={selectedItem.name}
                    className={isImageZoomed ? "max-h-[92vh] max-w-[92vw] rounded-md object-contain" : "aspect-[4/3] w-full rounded-md bg-muted object-cover"}
                    src={resolveBackendMediaUrl(selectedItem.imageUrl) || "/images/umika-hero.png"}
                  />
                  {!isImageZoomed ? <span className="mt-2 block text-xs font-medium text-muted-foreground">{copy.menuPage.zoomImage}</span> : null}
                </button>
                <div className="min-w-0 space-y-5">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Badge>{selectedItem.isAvailable === false ? copy.menuPage.unavailable : selectedItem.categoryName}</Badge>
                      <p className="text-lg font-semibold">${Number(selectedItem.price ?? 0).toFixed(2)}</p>
                    </div>
                    {selectedItem.description ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{selectedItem.description}</p> : null}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{copy.menuPage.options}</p>
                    {selectedItem.optionGroups.length ? (
                      <div className="mt-3 space-y-4">
                        {selectedItem.optionGroups.map((group, groupIndex) => (
                          <div className="rounded-md border border-border p-3" key={group.id ?? `group-${groupIndex}`}>
                            {group.name ? <p className="mb-2 text-sm font-semibold">{group.name}</p> : null}
                            <div className="space-y-2">
                              {group.options.map((option) => (
                                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50" key={option.id}>
                                  <span className="flex min-w-0 items-center gap-2">
                                    <input
                                      checked={selectedOptionIds.includes(option.id)}
                                      className="h-4 w-4 accent-primary"
                                      onChange={() => toggleOption(option.id)}
                                      type="checkbox"
                                    />
                                    <span className="truncate">{option.name}</span>
                                  </span>
                                  {option.priceModifier ? (
                                    <span className="shrink-0 text-muted-foreground">
                                      {option.priceModifier > 0 ? "+" : "-"}${Math.abs(option.priceModifier).toFixed(2)}
                                    </span>
                                  ) : null}
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">{copy.menuPage.noOptions}</p>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
                    <div>
                      <p className="text-sm font-semibold">{copy.menuPage.quantity}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Button size="icon" variant="outline" onClick={() => setItemQuantity((current) => Math.max(1, current - 1))} type="button">
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center text-sm font-semibold">{itemQuantity}</span>
                        <Button size="icon" variant="outline" onClick={() => setItemQuantity((current) => current + 1)} type="button">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <label className="block text-sm font-semibold">
                      {copy.menuPage.specialInstructions}
                      <textarea
                        className="mt-2 min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                        onChange={(event) => setItemNote(event.target.value)}
                        placeholder={copy.menuPage.specialInstructionsPlaceholder}
                        value={itemNote}
                      />
                    </label>
                  </div>
                </div>
              </div>
              <DialogFooter className="justify-end">
                <Button variant="outline" onClick={() => setSelectedItem(null)} type="button">
                  {copy.common.cancel}
                </Button>
                <Button
                  disabled={!cart || pendingId === selectedItem.id || selectedItem.isAvailable === false}
                  onClick={() => void addItem(selectedItem.id, itemQuantity, selectedOptionIds, itemNote)}
                  type="button"
                >
                  <Plus className="h-4 w-4" />
                  {copy.orderPage.addToCart}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
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
              {orderType === "PICKUP" && requestedPickupTime ? <PreviewRow label={copy.orderPage.requestedPickupTime} value={formatPickupDateTime(requestedPickupTime)} /> : null}
              {cart?.couponCode || Number(cart?.couponDiscount ?? 0) > 0 ? <PreviewRow label="Coupon discount" value={formatDiscountAmount(cart?.couponDiscount)} /> : null}
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
      <Dialog
        open={isPaymentDialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsPaymentDialogOpen(true);
          } else {
            closePaymentDialog();
          }
        }}
      >
        <DialogContent className="w-[min(96vw,38rem)]">
          <DialogHeader>
            <DialogTitle>{copy.orderPage.paymentTitle}</DialogTitle>
            <DialogDescription>{copy.orderPage.paymentNext}</DialogDescription>
          </DialogHeader>
          <div className="p-5 pt-0">
            {checkoutResult && isPaidOrderStatus(checkoutResult.status) ? (
              <OrderPlacedConfirmation order={checkoutResult} copy={copy} onClose={closePaymentDialog} />
            ) : checkoutResult ? (
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
                    resetOrderPageState();
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

function OrderPlacedConfirmation({ order, copy, onClose }: { order: CheckoutResponse; copy: Dictionary; onClose: () => void }) {
  const orderId = order.orderNumber ?? order.id ?? order.orderId;
  const isPickupOrder = order.orderType === "PICKUP";
  const isWaitingForAcceptance = (order.status ?? "").toUpperCase() === "PAID";
  const pickupTime = formatPickupDateTime(order.requestedPickupTime);

  return (
    <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-950">
      <p className="text-base font-semibold">{copy.orderPage.orderPlaced}</p>
      <p className="mt-2 text-emerald-800">{copy.orderPage.orderPlacedHelp}</p>
      {isPickupOrder && isWaitingForAcceptance ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-base font-semibold text-amber-900">
          {copy.orderPage.orderWaitingAcceptanceMessage}
        </p>
      ) : isPickupOrder && order.requestedPickupTime ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-white/80 px-3 py-3 text-base font-semibold text-emerald-950">
          {copy.orderPage.pickupReadyMessage.replace("{time}", pickupTime)}
        </p>
      ) : null}
      <div className="mt-4 space-y-2 rounded-md bg-white/70 p-3">
        {orderId ? <PreviewRow label={copy.orderPage.orderNumber} value={String(orderId)} /> : null}
        {isPickupOrder && !isWaitingForAcceptance && order.requestedPickupTime ? <PreviewRow label={copy.orderPage.requestedPickupTime} value={pickupTime} /> : null}
      </div>
      <Button className="mt-4 w-full" onClick={onClose} type="button">
        {copy.common.close}
      </Button>
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
        {order.requestedPickupTime ? <PreviewRow label={copy.orderPage.requestedPickupTime} value={formatPickupDateTime(order.requestedPickupTime)} /> : null}
        <PreviewRow label={copy.orderPage.subtotal} value={formatMoney(order.subtotal)} />
        <PreviewRow label={copy.orderPage.totalDiscount} value={formatMoney(order.totalDiscount)} />
        {typeof order.couponDiscount === "number" ? <PreviewRow label="Coupon discount" value={formatDiscountAmount(order.couponDiscount)} /> : null}
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
              const name = item.itemName ?? item.name ?? item.menuItemId ?? `${copy.orderPage.itemFallback} ${index + 1}`;
              const itemOptions = formatCartOptions(item.options ?? item.optionSnapshot);
              return (
                <div key={item.id ?? `${name}-${index}`} className="flex justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate">{name} x {item.quantity ?? 1}</span>
                    {itemOptions.optionText ? <span className="mt-1 block truncate text-xs text-emerald-800">{itemOptions.optionText}</span> : null}
                    {itemOptions.note ? <span className="mt-1 block truncate text-xs text-emerald-800">{copy.menuPage.specialInstructions}: {itemOptions.note}</span> : null}
                  </span>
                  <span>{formatMoney(item.lineTotal)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      {order.customerNote ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
          <p className="font-semibold text-amber-900">{copy.orderPage.customerNote}</p>
          <p className="mt-1 text-amber-950">{order.customerNote}</p>
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

function mergeCouponCart(current: CartResponse | null, payload: CouponApplyResponse): CartResponse | null {
  if (payload.id && payload.items) {
    return payload as CartResponse;
  }

  if (!current) {
    return null;
  }

  return {
    ...current,
    id: payload.cartId ?? payload.id ?? current.id,
    subtotal: typeof payload.subtotal === "number" ? payload.subtotal : current.subtotal,
    couponId: payload.couponId ?? payload.coupon_id ?? current.couponId ?? null,
    couponCode: payload.couponCode ?? payload.coupon_code ?? current.couponCode ?? null,
    couponDiscount: getNumber(payload.couponDiscount) ?? getNumber(payload.coupon_discount) ?? current.couponDiscount ?? null,
  };
}

function normalizeFrequentMenuItems(body: unknown, itemFallback: string): ResolvedMenuItem[] {
  const payload = normalizePayload<unknown>(body);
  const values = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.content)
      ? payload.content
      : isRecord(payload) && Array.isArray(payload.items)
        ? payload.items
        : [];

  return values
    .map((item) => normalizeFrequentMenuItem(item, itemFallback))
    .filter((item): item is ResolvedMenuItem => Boolean(item));
}

function normalizeFrequentMenuItem(value: unknown, itemFallback: string): ResolvedMenuItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = getString(value.menuItemId) ?? getString(value.id) ?? getString(value.itemId);

  if (!id) {
    return null;
  }

  return {
    id,
    categoryId: getString(value.categoryId) ?? "",
    categoryName: getString(value.categoryName) ?? getString(value.category) ?? "",
    name: getString(value.itemName) ?? getString(value.name) ?? getString(value.title) ?? itemFallback,
    description: getString(value.itemDescription) ?? getString(value.description) ?? getString(value.subtitle),
    price: getNumber(value.price) ?? getNumber(value.unitPrice) ?? 0,
    imageUrl: getString(value.imageUrl) ?? getString(value.image_url),
    displayOrder: getNumber(value.displayOrder) ?? getNumber(value.sortOrder) ?? null,
    isAvailable: getBoolean(value.isAvailable) ?? getBoolean(value.available) ?? null,
    optionGroups: [],
  };
}

function formatMoney(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `$${value.toFixed(2)}` : "--";
}

function formatDiscountAmount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `-${formatMoney(value)}` : "--";
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  return null;
}

function getBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
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

function normalizeRequestedPickupTime(value: string) {
  if (!value) {
    return null;
  }

  return value.length === 16 ? `${value}:00` : value;
}

function formatPickupDateTime(value: string | null | undefined) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.replace("T", " ");
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function isPaidOrderStatus(value: unknown) {
  return typeof value === "string" && ["PAID", "COMPLETED"].includes(value.toUpperCase());
}

function getCurrentPath(pathname: string, searchParams: URLSearchParams | ReadonlyURLSearchParamsLike) {
  const query = searchParams.toString();
  return `${pathname}${query ? `?${query}` : ""}`;
}

type ReadonlyURLSearchParamsLike = {
  toString: () => string;
};
