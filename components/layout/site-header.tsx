"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag, UserRound } from "lucide-react";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Button } from "@/components/ui/button";
import { getDictionary, type Locale } from "@/lib/i18n";

const navItems = [
  { href: "/menu", label: "Menu" },
  { href: "/order", label: "Order" },
  { href: "/rewards", label: "Rewards" },
] as const;

type CurrentAccountProfile = {
  role?: string | null;
  roles?: string[] | null;
};

export function SiteHeader({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const [canViewAdmin, setCanViewAdmin] = useState(false);

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
      const roles = [...(profile?.roles ?? []), profile?.role].filter((role): role is string => Boolean(role));
      setCanViewAdmin(roles.some((role) => role === "ROLE_ADMIN" || role === "ROLE_MANAGER"));
    }

    void loadAccess();

    return () => {
      active = false;
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/92 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Umika Sushi home">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary font-serif text-lg font-bold text-primary-foreground">
            U
          </span>
          <span className="hidden font-serif text-xl font-semibold tracking-normal sm:inline">{dict.common.brand}</span>
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
