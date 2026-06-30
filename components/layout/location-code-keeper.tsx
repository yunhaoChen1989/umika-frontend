"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const locationCodeStorageKey = "umika_location_code";
const locationIdStorageKey = "umika_location_id";
const locationIdAliasStorageKey = "location_id";
const resolvedLocationCodeStorageKey = "umika_location_id_code";

type DefaultLocationPayload =
  | string
  | {
      id?: string | null;
      locationId?: string | null;
      location_id?: string | null;
      locationCode?: string | null;
      location_code?: string | null;
      code?: string | null;
      defaultLocation?: DefaultLocationPayload | null;
      default_location?: DefaultLocationPayload | null;
      location?: DefaultLocationPayload | null;
    };

function removeStoredLocationId() {
  sessionStorage.removeItem(locationIdStorageKey);
  localStorage.removeItem(locationIdStorageKey);
  sessionStorage.removeItem(locationIdAliasStorageKey);
  localStorage.removeItem(locationIdAliasStorageKey);
  sessionStorage.removeItem(resolvedLocationCodeStorageKey);
  localStorage.removeItem(resolvedLocationCodeStorageKey);
}

function removeStoredLocationCode() {
  sessionStorage.removeItem(locationCodeStorageKey);
  localStorage.removeItem(locationCodeStorageKey);
  sessionStorage.removeItem(resolvedLocationCodeStorageKey);
  localStorage.removeItem(resolvedLocationCodeStorageKey);
}

function storeLocationCode(locationCode: string) {
  sessionStorage.setItem(locationCodeStorageKey, locationCode);
  localStorage.setItem(locationCodeStorageKey, locationCode);
}

function storeLocationId(locationCode: string, locationId: string) {
  sessionStorage.setItem(locationIdStorageKey, locationId);
  localStorage.setItem(locationIdStorageKey, locationId);
  sessionStorage.setItem(locationIdAliasStorageKey, locationId);
  localStorage.setItem(locationIdAliasStorageKey, locationId);
  sessionStorage.setItem(resolvedLocationCodeStorageKey, locationCode);
  localStorage.setItem(resolvedLocationCodeStorageKey, locationCode);
}

function storeLocationIdOnly(locationId: string) {
  sessionStorage.setItem(locationIdStorageKey, locationId);
  localStorage.setItem(locationIdStorageKey, locationId);
  sessionStorage.setItem(locationIdAliasStorageKey, locationId);
  localStorage.setItem(locationIdAliasStorageKey, locationId);
}

function normalizeDefaultLocation(payload: DefaultLocationPayload | null): { locationId: string | null; locationCode: string | null } {
  if (!payload) {
    return { locationId: null, locationCode: null };
  }

  if (typeof payload === "string") {
    return { locationId: payload.trim() || null, locationCode: null };
  }

  const nested = payload.defaultLocation ?? payload.default_location ?? payload.location;

  if (nested) {
    return normalizeDefaultLocation(nested);
  }

  return {
    locationId: payload.locationId ?? payload.location_id ?? payload.id ?? null,
    locationCode: payload.locationCode ?? payload.location_code ?? payload.code ?? null,
  };
}

export function LocationCodeKeeper() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const queryLocationCode = searchParams.get("locationCode")?.trim() ?? searchParams.get("storeCode")?.trim();
    const queryLocationId =
      searchParams.get("locationId")?.trim() ??
      searchParams.get("location")?.trim() ??
      searchParams.get("storeId")?.trim() ??
      searchParams.get("store")?.trim();

    if (queryLocationCode) {
      const storedLocationCode = sessionStorage.getItem(locationCodeStorageKey) ?? localStorage.getItem(locationCodeStorageKey);

      if (storedLocationCode && storedLocationCode !== queryLocationCode) {
        removeStoredLocationId();
      }

      storeLocationCode(queryLocationCode);

      if (!searchParams.get("locationCode")) {
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.delete("storeCode");
        nextParams.set("locationCode", queryLocationCode);
        router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
      }

      return;
    }

    if (queryLocationId) {
      removeStoredLocationCode();
      storeLocationIdOnly(queryLocationId);

      if (!searchParams.get("locationId")) {
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.delete("location");
        nextParams.delete("storeId");
        nextParams.delete("store");
        nextParams.set("locationId", queryLocationId);
        router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
      }

      return;
    }

    const storedLocationCode = sessionStorage.getItem(locationCodeStorageKey) ?? localStorage.getItem(locationCodeStorageKey);

    if (storedLocationCode) {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("locationCode", storedLocationCode);
      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
      return;
    }

    const controller = new AbortController();

    async function loadDefaultLocation() {
      const token = localStorage.getItem("umika_access_token");
      const headers = new Headers();

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      const response = await fetch("/api/me/default-location", {
        method: "GET",
        headers,
        cache: "no-store",
        signal: controller.signal,
      }).catch(() => null);

      if (controller.signal.aborted || response?.status === 401 || response?.status === 403 || !response?.ok) {
        return;
      }

      const defaultLocation = normalizeDefaultLocation((await response.json().catch(() => null)) as DefaultLocationPayload | null);

      if (!defaultLocation.locationId && !defaultLocation.locationCode) {
        return;
      }

      if (defaultLocation.locationCode) {
        storeLocationCode(defaultLocation.locationCode);

        if (defaultLocation.locationId) {
          storeLocationId(defaultLocation.locationCode, defaultLocation.locationId);
        }

        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.set("locationCode", defaultLocation.locationCode);
        router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
        return;
      }

      if (defaultLocation.locationId) {
        storeLocationIdOnly(defaultLocation.locationId);
      }
    }

    void loadDefaultLocation();

    return () => {
      controller.abort();
    };
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const locationCode =
      searchParams.get("locationCode")?.trim() ??
      searchParams.get("storeCode")?.trim() ??
      sessionStorage.getItem(locationCodeStorageKey)?.trim() ??
      localStorage.getItem(locationCodeStorageKey)?.trim();

    if (!locationCode) {
      const storedLocationId = sessionStorage.getItem(locationIdStorageKey) ?? localStorage.getItem(locationIdStorageKey);

      if (!storedLocationId) {
        removeStoredLocationId();
      }

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

      storeLocationCode(activeLocationCode);
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
      const locationId =
        new URLSearchParams(window.location.search).get("locationId")?.trim() ??
        sessionStorage.getItem(locationIdStorageKey)?.trim() ??
        localStorage.getItem(locationIdStorageKey)?.trim();

      if (!locationCode && !locationId) {
        return;
      }

      const url = new URL(anchor.href, window.location.origin);

      if (url.origin !== window.location.origin || url.protocol !== window.location.protocol) {
        return;
      }

      if (url.pathname.startsWith("/api/locale")) {
        const nextPath = url.searchParams.get("next");
        const nextUrl = new URL(nextPath || "/", window.location.origin);
        if (locationCode) {
          nextUrl.searchParams.set("locationCode", locationCode);
          nextUrl.searchParams.delete("locationId");
        } else if (locationId) {
          nextUrl.searchParams.set("locationId", locationId);
        }
        url.searchParams.set("next", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
      }

      if (locationCode) {
        url.searchParams.set("locationCode", locationCode);
        url.searchParams.delete("locationId");
      } else if (locationId) {
        url.searchParams.set("locationId", locationId);
      }
      anchor.href = `${url.pathname}${url.search}${url.hash}`;
    }

    document.addEventListener("click", carryLocationCode, { capture: true });

    return () => {
      document.removeEventListener("click", carryLocationCode, { capture: true });
    };
  }, []);

  return null;
}
