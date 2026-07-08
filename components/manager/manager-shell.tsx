"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bell, ChevronRight, LogOut, MapPin, Search, ShieldCheck, UserRound } from "lucide-react";

import { LoginRedirectLink } from "@/components/auth/login-redirect-link";
import { ManagerIcon } from "@/components/manager/manager-icon";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getLoginRedirectHref } from "@/lib/auth-redirect";
import { getDictionary, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { ManagerMenu } from "@/lib/manager-types";
import type { LocationDto } from "@/lib/location-types";

type CurrentAccountProfile = {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  role?: string | null;
  roles?: string[] | null;
};

type ManagerLocation = LocationDto & {
  locationId?: string | null;
};

export function ManagerShell({
  children,
  menus,
  locale,
}: {
  children: React.ReactNode;
  menus: ManagerMenu[];
  locale: Locale;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dict = getDictionary(locale);
  const activeBranchCodes = useMemo(() => getActiveBranchCodes(menus, pathname), [menus, pathname]);
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(() => new Set(activeBranchCodes));
  const [authStatus, setAuthStatus] = useState<"checking" | "authenticated" | "unauthenticated">("checking");
  const [accountName, setAccountName] = useState<string | null>(null);
  const [roleLabel, setRoleLabel] = useState<string | null>(null);
  const [location, setLocation] = useState<ManagerLocation | null>(null);
  const [locations, setLocations] = useState<ManagerLocation[]>([]);

  useEffect(() => {
    setExpandedCodes((current) => new Set([...current, ...activeBranchCodes]));
  }, [activeBranchCodes]);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const token = localStorage.getItem("umika_access_token");

      if (!token) {
        setAccountName(null);
        setRoleLabel(null);
        setAuthStatus("unauthenticated");
        router.replace(getLoginRedirectHref(`${pathname}${window.location.search}`));
        return;
      }

      const response = await fetch("/api/me/profile", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }).catch(() => null);

      if (!active) {
        return;
      }

      if (!response?.ok) {
        setAccountName(null);
        setRoleLabel(null);
        setAuthStatus("unauthenticated");
        router.replace(getLoginRedirectHref(`${pathname}${window.location.search}`));
        return;
      }

      const profile = (await response.json().catch(() => null)) as CurrentAccountProfile | null;
      setAccountName(resolveAccountName(profile));
      setRoleLabel(resolveRoleLabel(profile));
      setAuthStatus("authenticated");
    }

    function refreshProfile() {
      void loadProfile();
    }

    function refreshProfileFromStorage(event: StorageEvent) {
      if (event.key === "umika_access_token") {
        refreshProfile();
      }
    }

    void loadProfile();
    window.addEventListener("umika-auth-changed", refreshProfile);
    window.addEventListener("focus", refreshProfile);
    window.addEventListener("storage", refreshProfileFromStorage);

    return () => {
      active = false;
      window.removeEventListener("umika-auth-changed", refreshProfile);
      window.removeEventListener("focus", refreshProfile);
      window.removeEventListener("storage", refreshProfileFromStorage);
    };
  }, [pathname, router]);

  useEffect(() => {
    let active = true;

    async function loadLocations() {
      const token = localStorage.getItem("umika_access_token");

      if (!token) {
        setLocations([]);
        setLocation(null);
        return;
      }

      const response = await fetch("/api/manager/locations?page=0&size=300&sort=name,asc", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }).catch(() => null);

      if (!active) {
        return;
      }

      if (!response?.ok) {
        setLocations([]);
        await loadDefaultLocation();
        return;
      }

      const payload = (await response.json().catch(() => null)) as { content?: ManagerLocation[] } | ManagerLocation[] | null;
      const nextLocations = (Array.isArray(payload) ? payload : payload?.content ?? []).filter((option) => option.isActive !== false);
      setLocations(nextLocations);

      const context = getLocationContext(searchParams);
      const matchedLocation = nextLocations.find((option) => {
        const id = option.id ?? option.locationId;
        return id === context.locationId || option.locationCode === context.locationCode;
      });

      if (matchedLocation) {
        setLocation(matchedLocation);
        storeLocationContext(matchedLocation);
        return;
      }

      await loadDefaultLocation(nextLocations);
    }

    async function loadDefaultLocation(options: ManagerLocation[] = []) {
      const response = await fetch("/api/me/default-location", {
        method: "GET",
        cache: "no-store",
      }).catch(() => null);

      if (!active || !response?.ok) {
        if (active) {
          setLocation(null);
        }
        return;
      }

      const defaultLocation = (await response.json().catch(() => null)) as ManagerLocation | null;
      const matchedLocation =
        options.find((option) => option.id === defaultLocation?.id || option.id === defaultLocation?.locationId || option.locationCode === defaultLocation?.locationCode) ??
        defaultLocation;

      if (matchedLocation) {
        setLocation(matchedLocation);
        storeLocationContext(matchedLocation);
      }
    }

    void loadLocations();

    return () => {
      active = false;
    };
  }, [searchParams]);

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
      storeLocationCode(rawValue);
      clearStoredLocationId();
    } else {
      nextParams.set("locationId", rawValue);
      storeLocationIdOnly(rawValue);
      clearStoredLocationCode();
    }

    const selected = locations.find((option) => {
      const id = option.id ?? option.locationId;
      return kind === "code" ? option.locationCode === rawValue : id === rawValue;
    });

    if (selected) {
      setLocation(selected);
    }

    const query = nextParams.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function toggleExpanded(code: string) {
    setExpandedCodes((current) => {
      const next = new Set(current);

      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }

      return next;
    });
  }

  async function signOut() {
    const redirectPath = `${pathname}${window.location.search}`;

    await fetch("/api/auth/logout", {
      method: "POST",
      cache: "no-store",
    }).catch(() => null);

    localStorage.removeItem("umika_access_token");
    localStorage.removeItem("umika_token_type");
    sessionStorage.removeItem("umika_access_token");
    sessionStorage.removeItem("umika_token_type");

    router.replace(getLoginRedirectHref(redirectPath));
    router.refresh();
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

  if (authStatus === "checking") {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-4 text-slate-950">
        <div className="rounded-md border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow-sm">
          Checking manager access...
        </div>
      </div>
    );
  }

  if (authStatus === "unauthenticated") {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-4 text-slate-950">
        <div className="w-full max-w-md rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-base font-semibold text-slate-950">Login required</p>
          <p className="mt-2 text-sm text-slate-500">Please log in with a manager or staff account to open this page.</p>
          <Button asChild className="mt-4 w-full">
            <LoginRedirectLink>Login</LoginRedirectLink>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary font-serif text-lg font-bold text-primary-foreground">
            U
          </span>
          <div>
            <p className="font-serif text-lg font-semibold leading-none">{dict.common.brand}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">{dict.manager.console}</p>
          </div>
        </div>
        <nav className="h-[calc(100vh-4rem)] overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            {menus.map((item) => (
              <ManagerNavItem
                expandedCodes={expandedCodes}
                item={item}
                key={item.code}
                pathname={pathname}
                toggleExpanded={toggleExpanded}
              />
            ))}
          </div>
          {menus.length === 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
              <p className="font-semibold">No manager menus available.</p>
              <p className="mt-1 text-xs leading-5 text-amber-800">Log in with a manager account or add role menu rows in the backend.</p>
              <Button asChild variant="outline" size="sm" className="mt-3 border-amber-300 bg-white">
                <LoginRedirectLink>Login</LoginRedirectLink>
              </Button>
            </div>
          ) : null}
        </nav>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/manager" className="flex min-w-0 items-center gap-2 lg:hidden" aria-label="Manager dashboard">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary font-serif text-lg font-bold text-primary-foreground">
                  U
                </span>
                <span className="truncate font-serif text-lg font-semibold">{dict.manager.mobileTitle}</span>
              </Link>
              <Badge className="hidden rounded-md border-emerald-200 bg-emerald-50 text-emerald-800 sm:inline-flex">
                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                {roleLabel ?? "Manager"}
              </Badge>
              <div className="hidden min-w-72 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 md:flex">
                <Search className="h-4 w-4" />
                <span>{dict.manager.search}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="hidden min-w-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-950 shadow-sm md:flex">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <select
                  aria-label="Manager location"
                  className="h-8 max-w-40 bg-white text-sm font-bold text-slate-950 outline-none lg:max-w-56"
                  disabled={locationOptions.length === 0}
                  value={selectedLocationValue}
                  onChange={(event) => changeLocation(event.target.value)}
                >
                  {selectedLocationValue ? null : <option value="">Location</option>}
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
              <Button variant="outline" size="icon" aria-label="Notifications">
                <Bell className="h-4 w-4" />
              </Button>
              <div className="hidden min-w-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 xl:flex">
                <UserRound className="h-4 w-4 text-primary" />
                <span className="max-w-36 truncate font-semibold" title={accountName ?? undefined}>
                  {accountName ?? "User"}
                </span>
              </div>
              <Button onClick={() => void signOut()} variant="outline" size="sm" className="hidden sm:inline-flex" type="button">
                <LogOut className="h-4 w-4" />
                {dict.manager.signOut}
              </Button>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto border-t border-slate-200 px-4 py-2 sm:px-6 lg:hidden" aria-label="Manager sections">
            {menus.length === 0 ? (
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <LoginRedirectLink>Login</LoginRedirectLink>
              </Button>
            ) : null}
            {menus.map((item) => (
              <MobileManagerNavItem
                expandedCodes={expandedCodes}
                item={item}
                key={item.code}
                pathname={pathname}
                toggleExpanded={toggleExpanded}
              />
            ))}
          </nav>
        </header>
        <main className="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function MobileManagerNavItem({
  depth = 0,
  expandedCodes,
  item,
  pathname,
  toggleExpanded,
}: {
  depth?: number;
  expandedCodes: Set<string>;
  item: ManagerMenu;
  pathname: string;
  toggleExpanded: (code: string) => void;
}) {
  const exactActive = isMenuPathActive(item, pathname);
  const branchActive = isMenuBranchActive(item, pathname);
  const hasChildren = Boolean(item.children?.length);
  const expanded = hasChildren && expandedCodes.has(item.code);
  const className = cn(
    "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600",
    depth > 0 && "ml-2",
    exactActive && !hasChildren && "border-primary bg-primary text-primary-foreground",
    branchActive && hasChildren && "border-primary/30 bg-primary/10 text-primary",
  );
  const content = (
    <>
      {hasChildren ? <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")} /> : null}
      <ManagerIcon name={item.icon} className="h-3.5 w-3.5" />
      {item.name}
    </>
  );

  return (
    <>
      {hasChildren ? (
        <button className={className} onClick={() => toggleExpanded(item.code)} type="button">
          {content}
        </button>
      ) : (
        <Link className={className} href={item.path}>
          {content}
        </Link>
      )}
      {hasChildren && expanded
        ? item.children!.map((child) => (
            <MobileManagerNavItem
              depth={depth + 1}
              expandedCodes={expandedCodes}
              item={child}
              key={child.code}
              pathname={pathname}
              toggleExpanded={toggleExpanded}
            />
          ))
        : null}
    </>
  );
}

function ManagerNavItem({
  depth = 0,
  expandedCodes,
  item,
  pathname,
  toggleExpanded,
}: {
  depth?: number;
  expandedCodes: Set<string>;
  item: ManagerMenu;
  pathname: string;
  toggleExpanded: (code: string) => void;
}) {
  const exactActive = isMenuPathActive(item, pathname);
  const branchActive = isMenuBranchActive(item, pathname);
  const hasChildren = Boolean(item.children?.length);
  const expanded = hasChildren && expandedCodes.has(item.code);
  const itemClasses = cn(
    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left font-semibold transition-colors hover:bg-slate-100 hover:text-slate-950",
    depth === 0 ? "min-h-10 text-sm" : "min-h-9 text-xs",
    depth === 0 && "text-slate-600",
    depth > 0 && "text-slate-500",
    exactActive && depth === 0 && !hasChildren && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
    exactActive && depth > 0 && !hasChildren && "bg-slate-900 text-white hover:bg-slate-900 hover:text-white",
    branchActive && hasChildren && depth === 0 && "bg-primary/10 text-primary",
    branchActive && hasChildren && depth > 0 && "bg-slate-100 text-slate-950",
    !exactActive && branchActive && !hasChildren && depth === 0 && "bg-primary/10 text-primary",
    !exactActive && branchActive && !hasChildren && depth > 0 && "bg-slate-100 text-slate-950",
  );

  const content = (
    <>
      {hasChildren ? (
        <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 transition-transform", expanded && "rotate-90")} />
      ) : null}
      <ManagerIcon name={item.icon} className={cn("shrink-0", depth === 0 ? "h-4 w-4" : "h-3.5 w-3.5")} />
      <span className="truncate">{item.name}</span>
    </>
  );

  return (
    <div>
      {hasChildren ? (
        <button className={itemClasses} onClick={() => toggleExpanded(item.code)} type="button">
          {content}
        </button>
      ) : (
        <Link href={item.path} className={itemClasses}>
          {content}
        </Link>
      )}
      {hasChildren && expanded ? (
        <div className="ml-5 mt-1 space-y-1 border-l border-slate-200 pl-3">
          {item.children!.map((child) => (
            <ManagerNavItem
              depth={depth + 1}
              expandedCodes={expandedCodes}
              item={child}
              key={child.code}
              pathname={pathname}
              toggleExpanded={toggleExpanded}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function isMenuBranchActive(item: ManagerMenu, pathname: string): boolean {
  return isMenuPathActive(item, pathname) || Boolean(item.children?.some((child) => isMenuBranchActive(child, pathname)));
}

function isMenuPathActive(item: ManagerMenu, pathname: string): boolean {
  if (item.path === "/manager") {
    return pathname === item.path;
  }

  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}

function getActiveBranchCodes(menus: ManagerMenu[], pathname: string): string[] {
  const activeCodes: string[] = [];

  for (const menu of menus) {
    if (isMenuBranchActive(menu, pathname)) {
      activeCodes.push(menu.code, ...getActiveBranchCodes(menu.children ?? [], pathname));
    }
  }

  return activeCodes;
}

function resolveAccountName(profile: CurrentAccountProfile | null) {
  const fullName = [profile?.firstName, profile?.lastName]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ");

  return profile?.name?.trim() || fullName || profile?.email?.trim() || null;
}

function resolveRoleLabel(profile: CurrentAccountProfile | null) {
  const role = [...(profile?.roles ?? []), profile?.role]
    .filter((value): value is string => Boolean(value))
    .find(Boolean);

  if (!role) {
    return null;
  }

  return role
    .replace(/^ROLE_/i, "")
    .toLowerCase()
    .replace(/(^|_)([a-z])/g, (_match, prefix: string, letter: string) => `${prefix ? " " : ""}${letter.toUpperCase()}`);
}

function getLocationContext(searchParams: URLSearchParams) {
  return {
    locationId:
      searchParams.get("locationId")?.trim() ??
      searchParams.get("location")?.trim() ??
      searchParams.get("storeId")?.trim() ??
      searchParams.get("store")?.trim() ??
      sessionStorage.getItem("umika_location_id") ??
      sessionStorage.getItem("location_id") ??
      localStorage.getItem("umika_location_id") ??
      localStorage.getItem("location_id"),
    locationCode:
      searchParams.get("locationCode")?.trim() ??
      searchParams.get("storeCode")?.trim() ??
      sessionStorage.getItem("umika_location_code") ??
      localStorage.getItem("umika_location_code"),
  };
}

function storeLocationContext(location: ManagerLocation) {
  const id = location.id ?? location.locationId;

  if (location.locationCode) {
    storeLocationCode(location.locationCode);
  }

  if (id) {
    storeLocationIdOnly(id);
  }

  if (location.locationCode && id) {
    sessionStorage.setItem("umika_location_id_code", location.locationCode);
    localStorage.setItem("umika_location_id_code", location.locationCode);
  }
}

function storeLocationCode(locationCode: string) {
  sessionStorage.setItem("umika_location_code", locationCode);
  localStorage.setItem("umika_location_code", locationCode);
}

function storeLocationIdOnly(locationId: string) {
  sessionStorage.setItem("umika_location_id", locationId);
  localStorage.setItem("umika_location_id", locationId);
  sessionStorage.setItem("location_id", locationId);
  localStorage.setItem("location_id", locationId);
}

function clearStoredLocationCode() {
  sessionStorage.removeItem("umika_location_code");
  localStorage.removeItem("umika_location_code");
  sessionStorage.removeItem("umika_location_id_code");
  localStorage.removeItem("umika_location_id_code");
}

function clearStoredLocationId() {
  sessionStorage.removeItem("umika_location_id");
  localStorage.removeItem("umika_location_id");
  sessionStorage.removeItem("location_id");
  localStorage.removeItem("location_id");
  sessionStorage.removeItem("umika_location_id_code");
  localStorage.removeItem("umika_location_id_code");
}
