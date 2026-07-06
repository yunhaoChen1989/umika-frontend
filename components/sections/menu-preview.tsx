/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDictionary, type Locale } from "@/lib/i18n";
import { resolveBackendMediaUrl } from "@/lib/media-url";
import type { MenuRecommendation } from "@/lib/menu-recommendation-types";

type SpringPage<T> = {
  content?: T[];
};

export function MenuPreview({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const searchParams = useSearchParams();
  const [recommendations, setRecommendations] = useState<MenuRecommendation[]>([]);

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
        return;
      }

      const body = (await response.json().catch(() => null)) as SpringPage<MenuRecommendation> | MenuRecommendation[] | null;
      setRecommendations(Array.isArray(body) ? body : body?.content ?? []);
    }

    void loadRecommendations();

    return () => {
      active = false;
    };
  }, [searchParams]);

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

        {recommendations.length ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((item) => {
              const title = item.title?.trim() || item.itemName || "Menu item";
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
                        {item.isAvailable === false ? <Badge>Unavailable</Badge> : null}
                        {item.sku ? <Badge>{item.sku}</Badge> : null}
                      </div>
                      <Button asChild size="icon" aria-label={`${dict.menuPage.add} ${title}`}>
                        <Link href="/order">
                          <ArrowRight className="h-4 w-4" />
                        </Link>
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
    return "";
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

function formatMoney(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(value)
    : "";
}
