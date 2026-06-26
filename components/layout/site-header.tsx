"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MapPin, ShoppingBag, UserRound } from "lucide-react";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Button } from "@/components/ui/button";
import { getDictionary, type Locale } from "@/lib/i18n";
import type { LocationDto } from "@/lib/location-types";

const navItems = [
  { href: "/menu", label: "Menu" },
  { href: "/order", label: "Order" },
  { href: "/rewards", label: "Rewards" },
] as const;

type CurrentAccountProfile = {
  role?: string | null;
  roles?: string[] | null;
};

const adminRoles = new Set(["ADMIN", "MANAGER", "ROLE_ADMIN", "ROLE_MANAGER"]);

export function SiteHeader({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const searchParams = useSearchParams();
  const [canViewAdmin, setCanViewAdmin] = useState(false);
  const [location, setLocation] = useState<LocationDto | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("umika_access_token");

    if (!token) {
      setCanViewAdmin(false);
      return;
    }

    let active = true;

    async function loadAccess() {
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
        }
        return;
      }

      const profile = (await response.json().catch(() => null)) as CurrentAccountProfile | null;
      const roles = [...(profile?.roles ?? []), profile?.role]
        .filter((role): role is string => Boolean(role))
        .map((role) => role.toUpperCase());
      setCanViewAdmin(roles.some((role) => adminRoles.has(role)));
    }

    void loadAccess();

    return () => {
      active = false;
    };
  }, []);

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

  return (
    <header className="sticky top-0 z-50 border-b bg-background/92 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Umika Sushi home">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary font-serif text-lg font-bold text-primary-foreground">
            U
          </span>
          <span className="hidden min-w-0 sm:inline">
            <span className="block truncate font-serif text-xl font-semibold tracking-normal">{dict.common.brand}</span>
            {location ? (
              <span className="mt-0.5 hidden max-w-56 items-center gap-1 truncate text-xs text-muted-foreground lg:flex">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{location.name}</span>
              </span>
            ) : null}
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Button key={item.href} asChild variant="ghost" size="sm">
              <Link href={item.href}>{dict.nav[item.label.toLowerCase() as keyof typeof dict.nav]}</Link>
            </Button>
          ))}
          {canViewAdmin ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin">{dict.nav.admin}</Link>
            </Button>
          ) : null}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <LanguageSwitcher locale={locale} label={dict.common.language} />
          <Button asChild variant="outline" size="icon" aria-label="Account">
            <Link href="/account">
              <UserRound className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/order">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden min-[430px]:inline">{dict.common.order}</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
