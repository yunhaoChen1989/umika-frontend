"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MapPin, ShoppingCart, UserRound } from "lucide-react";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Button } from "@/components/ui/button";
import { cartChangedEventName, getCartItemCount, getOrCreateGuestSessionId, loadOrCreateCart } from "@/lib/cart-client";
import { getDictionary, type Locale } from "@/lib/i18n";
import type { LocationDto } from "@/lib/location-types";

const navItems = [
  { href: "/menu", label: "Menu" },
  { href: "/order", label: "Order" },
  { href: "/rewards", label: "Rewards" },
] as const;

type CurrentAccountProfile = {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  role?: string | null;
  roles?: string[] | null;
};

const adminRoles = new Set(["ADMIN", "MANAGER", "STAFF", "ROLE_ADMIN", "ROLE_MANAGER", "ROLE_STAFF"]);

export function SiteHeader({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [canViewAdmin, setCanViewAdmin] = useState(false);
  const [accountName, setAccountName] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationDto | null>(null);
  const [locations, setLocations] = useState<LocationDto[]>([]);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadAccess() {
      const token = localStorage.getItem("umika_access_token");

      if (!token) {
        setCanViewAdmin(false);
        setAccountName(null);
        return;
      }

      const response = await fetch("/api/me/profile", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }).catch(() => null);

      if (!active || !response?.ok) {
        if (active) {
          setCanViewAdmin(false);
          setAccountName(null);
        }
        return;
      }

      const profile = (await response.json().catch(() => null)) as CurrentAccountProfile | null;
      const roles = [...(profile?.roles ?? []), profile?.role]
        .filter((role): role is string => Boolean(role))
        .map((role) => role.toUpperCase());
      setCanViewAdmin(roles.some((role) => adminRoles.has(role)));
      setAccountName(resolveAccountName(profile));
    }

    function refreshAccess() {
      void loadAccess();
    }

    function refreshAccessFromStorage(event: StorageEvent) {
      if (event.key === "umika_access_token") {
        refreshAccess();
      }
    }

    void loadAccess();
    window.addEventListener("umika-auth-changed", refreshAccess);
    window.addEventListener("focus", refreshAccess);
    window.addEventListener("storage", refreshAccessFromStorage);

    return () => {
      active = false;
      window.removeEventListener("umika-auth-changed", refreshAccess);
      window.removeEventListener("focus", refreshAccess);
      window.removeEventListener("storage", refreshAccessFromStorage);
    };
  }, []);

  useEffect(() => {
    const locationId = location?.id ?? location?.locationId;
    let active = true;

    async function loadCartCount() {
      if (!locationId) {
        setCartCount(0);
        return;
      }

      const sessionId = getOrCreateGuestSessionId();

      try {
        const cart = await loadOrCreateCart(locationId, sessionId, dict.orderPage.cartError);

        if (active) {
          setCartCount(getCartItemCount(cart));
        }
      } catch {
        if (active) {
          setCartCount(0);
        }
      }
    }

    function refreshCartCount() {
      void loadCartCount();
    }

    function refreshCartCountFromStorage(event: StorageEvent) {
      if (!event.key || event.key.startsWith("umika_cart_id")) {
        refreshCartCount();
      }
    }

    void loadCartCount();
    window.addEventListener(cartChangedEventName, refreshCartCount);
    window.addEventListener("focus", refreshCartCount);
    window.addEventListener("storage", refreshCartCountFromStorage);

    return () => {
      active = false;
      window.removeEventListener(cartChangedEventName, refreshCartCount);
      window.removeEventListener("focus", refreshCartCount);
      window.removeEventListener("storage", refreshCartCountFromStorage);
    };
  }, [dict.orderPage.cartError, location?.id, location?.locationId]);

  useEffect(() => {
    const locationId = searchParams.get("locationId") ?? searchParams.get("location") ?? searchParams.get("storeId") ?? searchParams.get("store");
    const locationCode = searchParams.get("locationCode") ?? searchParams.get("storeCode");
    let active = true;

    async function loadLocation() {
      const token = localStorage.getItem("umika_access_token");
      const headers = new Headers();
      const url = new URL("/api/locations/current", window.location.origin);

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      if (locationId) {
        url.searchParams.set("locationId", locationId);
      }

      if (locationCode) {
        url.searchParams.set("locationCode", locationCode);
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers,
        cache: "no-store",
      }).catch(() => null);

      if (!active) {
        return;
      }

      if (!response?.ok) {
        setLocation(null);
        return;
      }

      setLocation((await response.json()) as LocationDto);
    }

    void loadLocation();

    return () => {
      active = false;
    };
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    async function loadLocations() {
      const token = localStorage.getItem("umika_access_token");
      const headers = new Headers();
      const url = new URL("/api/locations", window.location.origin);
      url.searchParams.set("page", "0");
      url.searchParams.set("size", "100");
      url.searchParams.append("sort", "name,asc");

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers,
        cache: "no-store",
      }).catch(() => null);

      if (!active) {
        return;
      }

      if (!response?.ok) {
        setLocations([]);
        return;
      }

      const payload = (await response.json().catch(() => null)) as { content?: LocationDto[] } | LocationDto[] | null;
      const nextLocations = Array.isArray(payload) ? payload : payload?.content ?? [];
      setLocations(nextLocations.filter((option) => option.isActive !== false));
    }

    void loadLocations();

    return () => {
      active = false;
    };
  }, []);

  function changeLocation(value: string) {
    const [kind, rawValue] = value.split(":", 2);

    if (!rawValue) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("location");
    nextParams.delete("storeId");
    nextParams.delete("store");
    nextParams.delete("storeCode");
    nextParams.delete("locationId");
    nextParams.delete("locationCode");

    if (kind === "code") {
      nextParams.set("locationCode", rawValue);
      localStorage.setItem("umika_location_code", rawValue);
      sessionStorage.setItem("umika_location_code", rawValue);
      localStorage.removeItem("umika_location_id");
      sessionStorage.removeItem("umika_location_id");
      localStorage.removeItem("location_id");
      sessionStorage.removeItem("location_id");
      localStorage.removeItem("umika_location_id_code");
      sessionStorage.removeItem("umika_location_id_code");
    } else {
      nextParams.set("locationId", rawValue);
      localStorage.setItem("umika_location_id", rawValue);
      sessionStorage.setItem("umika_location_id", rawValue);
      localStorage.setItem("location_id", rawValue);
      sessionStorage.setItem("location_id", rawValue);
      localStorage.removeItem("umika_location_code");
      sessionStorage.removeItem("umika_location_code");
      localStorage.removeItem("umika_location_id_code");
      sessionStorage.removeItem("umika_location_id_code");
    }

    const query = nextParams.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const selectedLocationValue = location?.locationCode
    ? `code:${location.locationCode}`
    : location?.id
      ? `id:${location.id}`
      : location?.locationId
        ? `id:${location.locationId}`
        : "";
  const locationOptions =
    locations.length > 0
      ? locations
      : location
        ? [location]
        : [];

  const renderNavLinks = (isMobile = false) => (
    <>
      {navItems.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Button
            key={item.href}
            asChild
            variant={isActive ? "default" : "ghost"}
            size="sm"
            className={isMobile ? "h-9 shrink-0 px-3 text-sm font-semibold" : undefined}
          >
            <Link href={item.href}>{dict.nav[item.label.toLowerCase() as keyof typeof dict.nav]}</Link>
          </Button>
        );
      })}
      {canViewAdmin ? (
        <Button
          asChild
          variant={pathname.startsWith("/admin") || pathname.startsWith("/manager") ? "default" : "ghost"}
          size="sm"
          className={isMobile ? "h-9 shrink-0 px-3 text-sm font-semibold" : undefined}
        >
          <Link href="/admin">{dict.nav.admin}</Link>
        </Button>
      ) : null}
    </>
  );

  return (
    <header className="sticky top-0 z-50 border-b bg-background/92 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label={dict.common.homeLabel}>
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary font-serif text-lg font-bold text-primary-foreground">
            U
          </span>
          <span className="hidden min-w-0 sm:inline">
            <span className="block truncate font-serif text-xl font-semibold tracking-normal">{dict.common.brand}</span>
            {location ? (
              <span className="mt-0.5 hidden max-w-64 items-center gap-1.5 truncate text-[13px] font-bold leading-none text-slate-900 lg:flex">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate font-sans tracking-normal">{location.name}</span>
              </span>
            ) : null}
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">{renderNavLinks()}</nav>
        <div className="flex min-w-0 shrink items-center justify-end gap-1.5 sm:shrink-0 sm:gap-2">
          <label className="flex min-w-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-sm text-slate-950 shadow-sm sm:gap-1.5 sm:px-2">
            <MapPin className="hidden h-4 w-4 shrink-0 text-primary min-[360px]:block" />
            <select
              aria-label={dict.common.browseLocation}
              className="h-8 min-w-0 max-w-20 bg-white text-sm font-bold text-slate-950 outline-none min-[360px]:max-w-28 sm:max-w-36 md:max-w-48"
              disabled={locationOptions.length === 0}
              value={selectedLocationValue}
              onChange={(event) => changeLocation(event.target.value)}
            >
              {selectedLocationValue ? null : <option value="">{dict.common.location}</option>}
              {locationOptions.map((option) => {
                const id = option.id ?? option.locationId;
                const value = option.locationCode ? `code:${option.locationCode}` : id ? `id:${id}` : "";

                if (!value) {
                  return null;
                }

                return (
                  <option className="bg-white text-base font-semibold text-slate-950" key={value} value={value}>
                    {option.name}
                  </option>
                );
              })}
            </select>
          </label>
          <LanguageSwitcher locale={locale} label={dict.common.language} />
          <Button asChild variant="outline" size="icon" aria-label={dict.common.accountLabel} className="hidden min-[360px]:inline-flex">
            <Link href="/account">
              <UserRound className="h-4 w-4" />
            </Link>
          </Button>
          {accountName ? (
            <Link
              href="/account"
              className="hidden max-w-28 truncate text-sm font-semibold text-foreground hover:text-primary lg:block"
              aria-label={dict.common.accountLabel}
              title={accountName}
            >
              {accountName}
            </Link>
          ) : null}
          <Button asChild variant="outline" size="icon" aria-label={dict.orderPage.cart}>
            <Link href="/order" className="relative">
              <ShoppingCart className="h-4 w-4" />
              {cartCount > 0 ? (
                <span className="absolute -right-2 -top-2 grid min-h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold leading-none text-primary-foreground">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              ) : null}
            </Link>
          </Button>
        </div>
      </div>
      <nav className="mx-auto flex h-12 max-w-7xl items-center gap-2 overflow-x-auto border-t border-border/70 px-4 sm:px-6 md:hidden">
        {renderNavLinks(true)}
      </nav>
    </header>
  );
}

function resolveAccountName(profile: CurrentAccountProfile | null) {
  const fullName = [profile?.firstName, profile?.lastName]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ");

  return profile?.name?.trim() || fullName || profile?.email?.trim() || null;
}
