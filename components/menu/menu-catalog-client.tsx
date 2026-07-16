"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Minus, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getAuthHeaders, getOrCreateGuestSessionId, loadOrCreateCart, normalizeCart, notifyCartChanged } from "@/lib/cart-client";
import type { CartResponse } from "@/lib/cart-types";
import type { Dictionary, Locale } from "@/lib/i18n";
import { flattenMenuCatalog, flattenMenuCategories, type ResolvedMenuCategory, type ResolvedMenuItem } from "@/lib/menu-catalog";
import { loadMenuItemDetail } from "@/lib/menu-item-detail-client";
import type { MenuCatalogResponse } from "@/lib/menu-management-types";
import { resolveBackendMediaUrl } from "@/lib/media-url";

export function MenuCatalogClient({ copy, locale }: { copy: Dictionary; locale: Locale }) {
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
  const [selectedItem, setSelectedItem] = useState<ResolvedMenuItem | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [isImageZoomed, setIsImageZoomed] = useState(false);

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

      setCategories(flattenMenuCategories(catalog, locale));
      setItems(flattenMenuCatalog(catalog, locale));
      setSelectedCategoryId("all");
      setCart(null);
      setStatus("ready");
    }

    void load();

    return () => {
      active = false;
    };
  }, [copy.menuPage.loadError, locale, searchParams]);

  async function openItem(item: ResolvedMenuItem) {
    setSelectedItem(item);
    setSelectedOptionIds([]);
    setQuantity(1);
    setNote("");
    setIsImageZoomed(false);
    setMessage(null);

    const detailItem = await loadMenuItemDetail(item, locale);
    setSelectedItem((current) => (current?.id === item.id ? detailItem : current));
  }

  async function addItem(menuItemId: string, nextQuantity = 1, optionIds: string[] = [], itemNote = "") {
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
          quantity: nextQuantity,
          optionIds,
          note: itemNote.trim() || null,
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
        setSelectedItem(null);
        notifyCartChanged();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.orderPage.cartError);
    } finally {
      setPendingItemId(null);
    }
  }

  function toggleOption(optionId: string) {
    setSelectedOptionIds((current) => (current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]));
  }

  const visibleItems = selectedCategoryId === "all" ? items : items.filter((item) => item.categoryId === selectedCategoryId);

  return (
    <>
      {message ? <p className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{message}</p> : null}
      <div className="mt-8 flex w-full max-w-full gap-2 overflow-x-auto pb-1">
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
                  <div>
                    <CardTitle>{item.name}</CardTitle>
                    <p className="mt-2 text-sm text-muted-foreground">{item.categoryName}</p>
                  </div>
                  <span className="font-semibold">${item.price.toFixed(2)}</span>
                </button>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{item.categoryName}</Badge>
                    {item.isAvailable === false ? <Badge>{copy.menuPage.unavailable}</Badge> : null}
                  </div>
                  <Button
                    size="icon"
                    aria-label={`${copy.menuPage.add} ${item.name}`}
                    disabled={pendingItemId === item.id || !selectedLocationId || item.isAvailable === false}
                    onClick={() => void openItem(item)}
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
                      <p className="text-lg font-semibold">${selectedItem.price.toFixed(2)}</p>
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
                      {copy.menuPage.specialInstructions}
                      <textarea
                        className="mt-2 min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                        onChange={(event) => setNote(event.target.value)}
                        placeholder={copy.menuPage.specialInstructionsPlaceholder}
                        value={note}
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
                  disabled={pendingItemId === selectedItem.id || selectedItem.isAvailable === false}
                  onClick={() => void addItem(selectedItem.id, quantity, selectedOptionIds, note)}
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
