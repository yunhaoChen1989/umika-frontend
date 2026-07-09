/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthHeaders, getOrCreateGuestSessionId, loadOrCreateCart, normalizeCart, notifyCartChanged } from "@/lib/cart-client";
import { getDictionary, type Locale } from "@/lib/i18n";
import { resolveBackendMediaUrl } from "@/lib/media-url";
import type { CartResponse } from "@/lib/cart-types";
import type { MenuRecommendation } from "@/lib/menu-recommendation-types";

type SpringPage<T> = {
  content?: T[];
};

export function MenuPreview({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const searchParams = useSearchParams();
  const [recommendations, setRecommendations] = useState<MenuRecommendation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setSessionId(getOrCreateGuestSessionId());
  }, []);

  useEffect(() => {
    let active = true;

    async function loadRecommendations() {
      const context = getStoredLocationContext(searchParams);
      const locationId = await resolveLocationId(context);
      const url = new URL("/api/menu-recommendations", window.location.origin);
      url.searchParams.set("limit", "6");

      if (locationId) {
        url.searchParams.set("locationId", locationId);
      }

      const response = await fetch(url.toString(), { cache: "no-store" }).catch(() => null);

      if (!active) {
        return;
      }

      if (!response?.ok) {
        setRecommendations([]);
        setSelectedLocationId(locationId);
        return;
      }

      const body = (await response.json().catch(() => null)) as SpringPage<MenuRecommendation> | MenuRecommendation[] | null;
      setRecommendations(Array.isArray(body) ? body : body?.content ?? []);
      setSelectedLocationId(locationId);
    }

    void loadRecommendations();

    return () => {
      active = false;
    };
  }, [searchParams]);

  async function addRecommendationToCart(item: MenuRecommendation) {
    if (!selectedLocationId || !sessionId || !item.menuItemId) {
      setMessage(dict.orderPage.locationRequired);
      return;
    }

    setPendingItemId(item.menuItemId);
    setMessage(null);

    try {
      const activeCart = cart ?? (await loadOrCreateCart(selectedLocationId, sessionId, dict.orderPage.cartError));
      const headers = getAuthHeaders();
      headers.set("Content-Type", "application/json");

      const response = await fetch(`/api/cart/${activeCart.id}/items?sessionId=${encodeURIComponent(sessionId)}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          locationId: selectedLocationId,
          menuItemId: item.menuItemId,
          quantity: 1,
          optionIds: [],
          note: null,
        }),
        cache: "no-store",
      }).catch(() => null);

      if (!response?.ok) {
        const body = response ? await response.json().catch(() => null) : null;
        setMessage(resolveErrorMessage(body, dict.orderPage.cartError));
        return;
      }

      const nextCart = normalizeCart(await response.json().catch(() => null));

      if (nextCart) {
        setCart(nextCart);
        notifyCartChanged();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : dict.orderPage.cartError);
    } finally {
      setPendingItemId(null);
    }
  }

  return (
    <section className="bg-background py-16 sm:py-20" aria-labelledby="guest-favorites-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">{dict.home.menuEyebrow}</p>
            <h2 id="guest-favorites-title" className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">
              {dict.home.menuTitle}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              {dict.home.menuCopy}
            </p>
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/menu">{dict.home.seeFullMenu}</Link>
          </Button>
        </div>

        {message ? (
          <p className="mt-6 rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">
            {message}
          </p>
        ) : null}

        {recommendations.length ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((item) => {
              const title = item.title?.trim() || item.itemName || dict.menuPage.itemFallback;
              const subtitle = item.subtitle?.trim() || item.itemDescription || "";

              return (
                <Card key={item.id} className="flex flex-col">
                  <div className="aspect-[4/3] overflow-hidden rounded-t-md bg-muted">
                    <img
                      alt={title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      src={resolveBackendMediaUrl(item.imageUrl) || "/images/umika-hero.png"}
                    />
                  </div>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle>{title}</CardTitle>
                      <span className="font-semibold">{formatMoney(item.price)}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    {subtitle ? <p className="text-sm leading-6 text-muted-foreground">{subtitle}</p> : null}
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        {item.isAvailable === false ? <Badge>{dict.menuPage.unavailable}</Badge> : null}
                        {item.sku ? <Badge>{item.sku}</Badge> : null}
                      </div>
                      <Button
                        size="icon"
                        aria-label={`${dict.menuPage.add} ${title}`}
                        disabled={pendingItemId === item.menuItemId || item.isAvailable === false || !selectedLocationId}
                        onClick={() => void addRecommendationToCart(item)}
                        type="button"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function getStoredLocationContext(searchParams?: URLSearchParams | ReadonlyURLSearchParamsLike) {
  if (typeof window === "undefined") {
    return { locationId: null, locationCode: null };
  }

  return {
    locationId:
      searchParams?.get("locationId")?.trim() ??
      searchParams?.get("location")?.trim() ??
      searchParams?.get("storeId")?.trim() ??
      searchParams?.get("store")?.trim() ??
      sessionStorage.getItem("umika_location_id") ??
      sessionStorage.getItem("location_id") ??
      localStorage.getItem("umika_location_id") ??
      localStorage.getItem("location_id"),
    locationCode:
      searchParams?.get("locationCode")?.trim() ??
      searchParams?.get("storeCode")?.trim() ??
      sessionStorage.getItem("umika_location_code") ??
      localStorage.getItem("umika_location_code"),
  };
}

type ReadonlyURLSearchParamsLike = {
  get: (name: string) => string | null;
};

async function resolveLocationId(context: { locationId: string | null; locationCode: string | null }) {
  if (context.locationId) {
    return context.locationId;
  }

  if (!context.locationCode) {
    const response = await fetch("/api/locations/current", {
      headers: getAuthHeaders(),
      cache: "no-store",
    }).catch(() => null);

    if (!response?.ok) {
      return "";
    }

    const body = (await response.json().catch(() => null)) as { locationId?: string; id?: string } | null;
    return body?.locationId ?? body?.id ?? "";
  }

  const url = new URL("/api/locations/resolve-id", window.location.origin);
  url.searchParams.set("locationCode", context.locationCode);
  const response = await fetch(url.toString(), { cache: "no-store" }).catch(() => null);

  if (!response?.ok) {
    return "";
  }

  const body = (await response.json().catch(() => null)) as { locationId?: string; id?: string } | string | null;
  return typeof body === "string" ? body.trim() : body?.locationId ?? body?.id ?? "";
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
  return typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(value)
    : "";
}
