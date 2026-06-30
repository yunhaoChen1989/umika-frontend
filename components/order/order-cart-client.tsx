"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CartResponse } from "@/lib/cart-types";
import type { Dictionary } from "@/lib/i18n";
import { flattenMenuCatalog, type ResolvedMenuItem } from "@/lib/menu-catalog";
import type { MenuCatalogResponse } from "@/lib/menu-management-types";

const guestSessionKey = "umika_guest_session_id";
const cartIdKeyPrefix = "umika_cart_id";

export function OrderCartClient({ copy }: { copy: Dictionary }) {
  const [menuItems, setMenuItems] = useState<ResolvedMenuItem[]>([]);
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState("");

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem("umika_access_token");
    const headers = new Headers();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return headers;
  }, []);

  useEffect(() => {
    setSessionId(getOrCreateGuestSessionId());
  }, []);

  const loadCart = useCallback(
    async (selectedLocationId: string) => {
      const storedCartId = localStorage.getItem(`${cartIdKeyPrefix}:${selectedLocationId}`);

      if (storedCartId) {
        const response = await fetch(`/api/cart/${storedCartId}?sessionId=${encodeURIComponent(sessionId)}`, {
          method: "GET",
          headers: authHeaders(),
          cache: "no-store",
        }).catch(() => null);

        if (response?.ok) {
          setCart((await response.json()) as CartResponse);
          return;
        }
      }

      const headers = authHeaders();
      headers.set("Content-Type", "application/json");

      const response = await fetch("/api/cart", {
        method: "POST",
        headers,
        body: JSON.stringify({
          locationId: selectedLocationId,
          sessionId,
        }),
        cache: "no-store",
      }).catch(() => null);

      if (!response?.ok) {
        throw new Error(copy.orderPage.cartError);
      }

      const nextCart = (await response.json()) as CartResponse;
      localStorage.setItem(`${cartIdKeyPrefix}:${selectedLocationId}`, nextCart.id);
      setCart(nextCart);
    },
    [authHeaders, copy.orderPage.cartError, sessionId],
  );

  useEffect(() => {
    async function load() {
      if (!sessionId) {
        return;
      }

      setStatus("loading");
      setMessage(null);

      const locationResponse = await fetch("/api/locations/current", { cache: "no-store" }).catch(() => null);

      if (!locationResponse?.ok) {
        setStatus("error");
        setMessage(copy.orderPage.locationRequired);
        return;
      }

      const location = (await locationResponse.json()) as { id?: string };
      const selectedLocationId = location.id ?? "";

      if (!selectedLocationId) {
        setStatus("error");
        setMessage(copy.orderPage.locationRequired);
        return;
      }

      const catalogUrl = new URL("/api/menu-catalog", window.location.origin);
      catalogUrl.searchParams.set("locationId", selectedLocationId);

      const menuResponse = await fetch(catalogUrl.toString(), {
        headers: authHeaders(),
        cache: "no-store",
      }).catch(() => null);

      if (menuResponse?.ok) {
        setMenuItems(flattenMenuCatalog((await menuResponse.json()) as MenuCatalogResponse));
      } else {
        const body = menuResponse ? await menuResponse.json().catch(() => null) : null;
        setMessage(resolveErrorMessage(body, copy.menuPage.loadError));
      }

      await loadCart(selectedLocationId);
      setStatus("ready");
    }

    void load().catch((error: unknown) => {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : copy.orderPage.cartError);
    });
  }, [authHeaders, copy.menuPage.loadError, copy.orderPage.cartError, copy.orderPage.locationRequired, loadCart, sessionId]);

  async function addItem(menuItemId: string) {
    if (!cart) {
      return;
    }

    setPendingId(menuItemId);
    setMessage(null);

    const headers = authHeaders();
    headers.set("Content-Type", "application/json");

    const response = await fetch(`/api/cart/${cart.id}/items?sessionId=${encodeURIComponent(sessionId)}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
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

    setCart((await response.json()) as CartResponse);
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
    const headers = authHeaders();
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

    setCart((await response.json()) as CartResponse);
  }

  async function removeItem(itemId: string) {
    if (!cart) {
      return;
    }

    setPendingId(itemId);
    const response = await fetch(`/api/cart/${cart.id}/items/${itemId}?sessionId=${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
      headers: authHeaders(),
      cache: "no-store",
    }).catch(() => null);

    setPendingId(null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setMessage(resolveErrorMessage(body, copy.orderPage.cartError));
      return;
    }

    setCart((await response.json()) as CartResponse);
  }

  const subtotal = Number(cart?.subtotal ?? 0);
  const tax = subtotal * 0.13;
  const total = subtotal + tax;

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
          <div className="flex justify-between">
            <span className="text-muted-foreground">{copy.orderPage.tax}</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t pt-3 text-base font-semibold">
            <span>{copy.orderPage.total}</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
        <Button className="mt-6 w-full whitespace-normal" disabled={!cart?.items.length} size="lg">
          <CreditCard className="h-4 w-4" />
          {copy.orderPage.checkout}
        </Button>
      </aside>
    </section>
  );
}

function getOrCreateGuestSessionId() {
  const existing = localStorage.getItem(guestSessionKey);

  if (existing) {
    return existing;
  }

  const value = crypto.randomUUID();
  localStorage.setItem(guestSessionKey, value);
  return value;
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
