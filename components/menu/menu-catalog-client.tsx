"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthHeaders, getOrCreateGuestSessionId, loadOrCreateCart, normalizeCart, notifyCartChanged } from "@/lib/cart-client";
import type { CartResponse } from "@/lib/cart-types";
import type { Dictionary } from "@/lib/i18n";
import { flattenMenuCatalog, flattenMenuCategories, type ResolvedMenuCategory, type ResolvedMenuItem } from "@/lib/menu-catalog";
import type { MenuCatalogResponse } from "@/lib/menu-management-types";
import { resolveBackendMediaUrl } from "@/lib/media-url";

export function MenuCatalogClient({ copy }: { copy: Dictionary }) {
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<ResolvedMenuCategory[]>([]);
  const [items, setItems] = useState<ResolvedMenuItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    setSessionId(getOrCreateGuestSessionId());
  }, []);

  useEffect(() => {
    const locationId = searchParams.get("locationId") ?? searchParams.get("location") ?? searchParams.get("storeId") ?? searchParams.get("store");
    const locationCode = searchParams.get("locationCode") ?? searchParams.get("storeCode");
    let active = true;

    async function load() {
      setStatus("loading");
      setMessage(null);

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
      const location = locationResponse?.ok ? ((await locationResponse.json()) as { id?: string; locationId?: string }) : null;
      const resolvedLocationId = location?.id ?? location?.locationId;
      const url = new URL("/api/menu-catalog", window.location.origin);

      if (resolvedLocationId) {
        url.searchParams.set("locationId", resolvedLocationId);
        setSelectedLocationId(resolvedLocationId);
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: getAuthHeaders(),
        cache: "no-store",
      }).catch(() => null);

      if (!active) {
        return;
      }

      if (!response?.ok) {
        const body = response ? await response.json().catch(() => null) : null;
        setStatus("error");
        setMessage(resolveErrorMessage(body, copy.menuPage.loadError));
        return;
      }

      const catalog = (await response.json()) as MenuCatalogResponse;
      if (!active) {
        return;
      }

      setCategories(flattenMenuCategories(catalog));
      setItems(flattenMenuCatalog(catalog));
      setSelectedCategoryId("all");
      setCart(null);
      setStatus("ready");
    }

    void load();

    return () => {
      active = false;
    };
  }, [copy.menuPage.loadError, searchParams]);

  async function addItem(menuItemId: string) {
    if (!selectedLocationId || !sessionId) {
      setMessage(copy.orderPage.locationRequired);
      return;
    }

    setPendingItemId(menuItemId);
    setMessage(null);

    try {
      const activeCart = cart ?? (await loadOrCreateCart(selectedLocationId, sessionId, copy.orderPage.cartError));
      const headers = getAuthHeaders();
      headers.set("Content-Type", "application/json");

      const response = await fetch(`/api/cart/${activeCart.id}/items?sessionId=${encodeURIComponent(sessionId)}`, {
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
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.orderPage.cartError);
    } finally {
      setPendingItemId(null);
    }
  }

  const visibleItems = selectedCategoryId === "all" ? items : items.filter((item) => item.categoryId === selectedCategoryId);

  return (
    <>
      {message ? <p className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{message}</p> : null}
      <div className="-mx-4 mt-8 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <Button onClick={() => setSelectedCategoryId("all")} variant={selectedCategoryId === "all" ? "default" : "outline"} size="sm">
          {copy.menuPage.all}
        </Button>
        {categories.map((category) => (
          <Button
            key={category.id}
            onClick={() => setSelectedCategoryId(category.id)}
            variant={selectedCategoryId === category.id ? "default" : "outline"}
            size="sm"
          >
            {category.name}
          </Button>
        ))}
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {status === "loading" ? (
          <p className="text-sm text-muted-foreground">{copy.menuPage.loading}</p>
        ) : visibleItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">{copy.menuPage.empty}</p>
        ) : (
          visibleItems.map((item) => (
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
                  <div>
                    <CardTitle>{item.name}</CardTitle>
                    <p className="mt-2 text-sm text-muted-foreground">{item.categoryName}</p>
                  </div>
                  <span className="font-semibold">${item.price.toFixed(2)}</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <Badge>{item.categoryName}</Badge>
                  <Button
                    size="icon"
                    aria-label={`${copy.menuPage.add} ${item.name}`}
                    disabled={pendingItemId === item.id || !selectedLocationId}
                    onClick={() => void addItem(item.id)}
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </>
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
