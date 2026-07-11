/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Minus, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getAuthHeaders, getOrCreateGuestSessionId, loadOrCreateCart, normalizeCart, notifyCartChanged } from "@/lib/cart-client";
import { getDictionary, type Locale } from "@/lib/i18n";
import { loadMenuItemDetail } from "@/lib/menu-item-detail-client";
import type { ResolvedMenuItem } from "@/lib/menu-catalog";
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
  const [selectedItem, setSelectedItem] = useState<ResolvedMenuItem | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [isImageZoomed, setIsImageZoomed] = useState(false);

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

  async function openRecommendation(item: MenuRecommendation) {
    const resolvedItem = recommendationToResolvedItem(item, dict.menuPage.itemFallback);

    if (!resolvedItem) {
      return;
    }

    setSelectedItem(resolvedItem);
    setSelectedOptionIds([]);
    setQuantity(1);
    setNote("");
    setIsImageZoomed(false);
    setMessage(null);

    const detailItem = await loadMenuItemDetail(resolvedItem);
    setSelectedItem((current) => (current?.id === resolvedItem.id ? detailItem : current));
  }

  function toggleOption(optionId: string) {
    setSelectedOptionIds((current) => (current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]));
  }

  async function addRecommendationToCart(menuItemId: string, itemQuantity = 1, optionIds: string[] = [], itemNote = "") {
    if (!selectedLocationId || !sessionId || !menuItemId) {
      setMessage(dict.orderPage.locationRequired);
      return;
    }

    setPendingItemId(menuItemId);
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
          menuItemId,
          quantity: itemQuantity,
          optionIds,
          note: itemNote.trim() || null,
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
        setSelectedItem(null);
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
                  <button className="aspect-[4/3] overflow-hidden rounded-t-md bg-muted text-left" onClick={() => void openRecommendation(item)} type="button">
                    <img
                      alt={title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      src={resolveBackendMediaUrl(item.imageUrl) || "/images/umika-hero.png"}
                    />
                  </button>
                  <CardHeader>
                    <button className="flex w-full items-start justify-between gap-3 text-left" onClick={() => void openRecommendation(item)} type="button">
                      <CardTitle>{title}</CardTitle>
                      <span className="font-semibold">{formatMoney(item.price)}</span>
                    </button>
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
                        onClick={() => void openRecommendation(item)}
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
      <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="w-[min(96vw,54rem)]">
          {selectedItem ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedItem.name}</DialogTitle>
                <DialogDescription>{dict.menuPage.details}</DialogDescription>
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
                  {!isImageZoomed ? <span className="mt-2 block text-xs font-medium text-muted-foreground">{dict.menuPage.zoomImage}</span> : null}
                </button>
                <div className="min-w-0 space-y-5">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {selectedItem.categoryName ? <Badge>{selectedItem.isAvailable === false ? dict.menuPage.unavailable : selectedItem.categoryName}</Badge> : null}
                      <p className="text-lg font-semibold">{formatMoney(selectedItem.price)}</p>
                    </div>
                    {selectedItem.description ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{selectedItem.description}</p> : null}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{dict.menuPage.options}</p>
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
                      <p className="mt-2 text-sm text-muted-foreground">{dict.menuPage.noOptions}</p>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
                    <div>
                      <p className="text-sm font-semibold">{dict.menuPage.quantity}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Button size="icon" variant="outline" onClick={() => setQuantity((current) => Math.max(1, current - 1))} type="button">
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
                        <Button size="icon" variant="outline" onClick={() => setQuantity((current) => current + 1)} type="button">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <label className="block text-sm font-semibold">
                      {dict.menuPage.specialInstructions}
                      <textarea
                        className="mt-2 min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                        onChange={(event) => setNote(event.target.value)}
                        placeholder={dict.menuPage.specialInstructionsPlaceholder}
                        value={note}
                      />
                    </label>
                  </div>
                </div>
              </div>
              <DialogFooter className="justify-end">
                <Button variant="outline" onClick={() => setSelectedItem(null)} type="button">
                  {dict.common.cancel}
                </Button>
                <Button
                  disabled={pendingItemId === selectedItem.id || selectedItem.isAvailable === false}
                  onClick={() => void addRecommendationToCart(selectedItem.id, quantity, selectedOptionIds, note)}
                  type="button"
                >
                  <Plus className="h-4 w-4" />
                  {dict.orderPage.addToCart}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function recommendationToResolvedItem(item: MenuRecommendation, itemFallback: string): ResolvedMenuItem | null {
  if (!item.menuItemId) {
    return null;
  }

  return {
    id: item.menuItemId,
    categoryId: item.categoryId ?? "",
    categoryName: item.sku ?? "",
    name: item.title?.trim() || item.itemName || itemFallback,
    description: item.subtitle?.trim() || item.itemDescription || null,
    price: Number(item.price ?? 0),
    imageUrl: item.imageUrl,
    displayOrder: item.sortOrder,
    isAvailable: item.isAvailable,
    optionGroups: [],
  };
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
