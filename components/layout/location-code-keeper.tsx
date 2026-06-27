"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const locationCodeStorageKey = "umika_location_code";
const locationIdStorageKey = "umika_location_id";
const locationIdAliasStorageKey = "location_id";
const resolvedLocationCodeStorageKey = "umika_location_id_code";

function removeStoredLocationId() {
  sessionStorage.removeItem(locationIdStorageKey);
  localStorage.removeItem(locationIdStorageKey);
  sessionStorage.removeItem(locationIdAliasStorageKey);
  localStorage.removeItem(locationIdAliasStorageKey);
  sessionStorage.removeItem(resolvedLocationCodeStorageKey);
  localStorage.removeItem(resolvedLocationCodeStorageKey);
}

function storeLocationId(locationCode: string, locationId: string) {
  sessionStorage.setItem(locationIdStorageKey, locationId);
  localStorage.setItem(locationIdStorageKey, locationId);
  sessionStorage.setItem(locationIdAliasStorageKey, locationId);
  localStorage.setItem(locationIdAliasStorageKey, locationId);
  sessionStorage.setItem(resolvedLocationCodeStorageKey, locationCode);
  localStorage.setItem(resolvedLocationCodeStorageKey, locationCode);
}

export function LocationCodeKeeper() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const queryLocationCode = searchParams.get("locationCode")?.trim() ?? searchParams.get("storeCode")?.trim();

    if (queryLocationCode) {
      const storedLocationCode = sessionStorage.getItem(locationCodeStorageKey) ?? localStorage.getItem(locationCodeStorageKey);

      if (storedLocationCode && storedLocationCode !== queryLocationCode) {
        removeStoredLocationId();
      }

      sessionStorage.setItem(locationCodeStorageKey, queryLocationCode);
      localStorage.setItem(locationCodeStorageKey, queryLocationCode);

      if (!searchParams.get("locationCode")) {
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.delete("storeCode");
        nextParams.set("locationCode", queryLocationCode);
        router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
      }

      return;
    }

    const storedLocationCode = sessionStorage.getItem(locationCodeStorageKey) ?? localStorage.getItem(locationCodeStorageKey);

    if (!storedLocationCode) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("locationCode", storedLocationCode);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const locationCode =
      searchParams.get("locationCode")?.trim() ??
      searchParams.get("storeCode")?.trim() ??
      sessionStorage.getItem(locationCodeStorageKey)?.trim() ??
      localStorage.getItem(locationCodeStorageKey)?.trim();

    if (!locationCode) {
      removeStoredLocationId();
      return;
    }

    const activeLocationCode = locationCode;
    const resolvedLocationCode = sessionStorage.getItem(resolvedLocationCodeStorageKey) ?? localStorage.getItem(resolvedLocationCodeStorageKey);
    const cachedLocationId = sessionStorage.getItem(locationIdStorageKey) ?? localStorage.getItem(locationIdStorageKey);

    if (resolvedLocationCode === activeLocationCode && cachedLocationId) {
      return;
    }

    const controller = new AbortController();

    async function resolveLocationId() {
      const url = new URL("/api/locations/resolve-id", window.location.origin);
      url.searchParams.set("locationCode", activeLocationCode);

      const response = await fetch(url.toString(), {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      }).catch(() => null);

      if (!response?.ok) {
        removeStoredLocationId();
        return;
      }

      const contentType = response.headers.get("Content-Type") ?? "";
      const body = contentType.includes("application/json")
        ? ((await response.json().catch(() => null)) as { id?: string; locationId?: string; location_id?: string } | string | null)
        : await response.text().catch(() => null);
      const locationId = typeof body === "string" ? body.trim() : body?.locationId ?? body?.location_id ?? body?.id;

      if (!locationId) {
        return;
      }

      sessionStorage.setItem(locationCodeStorageKey, activeLocationCode);
      localStorage.setItem(locationCodeStorageKey, activeLocationCode);
      storeLocationId(activeLocationCode, locationId);
    }

    void resolveLocationId();

    return () => {
      controller.abort();
    };
  }, [searchParams]);

  useEffect(() => {
    function carryLocationCode(event: MouseEvent) {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest<HTMLAnchorElement>("a[href]");

      if (!anchor || anchor.target || anchor.hasAttribute("download")) {
        return;
      }

      const locationCode =
        new URLSearchParams(window.location.search).get("locationCode")?.trim() ??
        sessionStorage.getItem(locationCodeStorageKey)?.trim() ??
        localStorage.getItem(locationCodeStorageKey)?.trim();

      if (!locationCode) {
        return;
      }

      const url = new URL(anchor.href, window.location.origin);

      if (url.origin !== window.location.origin || url.protocol !== window.location.protocol) {
        return;
      }

      if (url.pathname.startsWith("/api/locale")) {
        const nextPath = url.searchParams.get("next");
        const nextUrl = new URL(nextPath || "/", window.location.origin);
        nextUrl.searchParams.set("locationCode", locationCode);
        url.searchParams.set("next", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
      }

      url.searchParams.set("locationCode", locationCode);
      anchor.href = `${url.pathname}${url.search}${url.hash}`;
    }

    document.addEventListener("click", carryLocationCode, { capture: true });

    return () => {
      document.removeEventListener("click", carryLocationCode, { capture: true });
    };
  }, []);

  return null;
}
