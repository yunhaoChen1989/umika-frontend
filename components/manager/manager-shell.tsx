"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronRight, LogOut, Search, ShieldCheck } from "lucide-react";

import { LoginRedirectLink } from "@/components/auth/login-redirect-link";
import { ManagerIcon } from "@/components/manager/manager-icon";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDictionary, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { ManagerMenu } from "@/lib/manager-types";

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
  const dict = getDictionary(locale);
  const activeBranchCodes = useMemo(() => getActiveBranchCodes(menus, pathname), [menus, pathname]);
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(() => new Set(activeBranchCodes));

  useEffect(() => {
    setExpandedCodes((current) => new Set([...current, ...activeBranchCodes]));
  }, [activeBranchCodes]);

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
                {dict.manager.role}
              </Badge>
              <div className="hidden min-w-72 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 md:flex">
                <Search className="h-4 w-4" />
                <span>{dict.manager.search}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher locale={locale} label={dict.common.language} />
              <Button variant="outline" size="icon" aria-label="Notifications">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="hidden sm:inline-flex">
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
