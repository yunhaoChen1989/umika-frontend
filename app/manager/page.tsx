import Link from "next/link";
import { cookies } from "next/headers";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  ClipboardList,
  DollarSign,
  ShoppingBag,
  Users,
} from "lucide-react";

import { ManagerPageHeader } from "@/components/manager/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { backendBaseUrl } from "@/lib/backend-proxy";
import { getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n-server";
import { cn } from "@/lib/utils";

type SearchParams = Record<string, string | string[] | undefined>;

type PageResponse<T> = {
  content?: T[];
  totalElements?: number;
};

type OrderItem = {
  itemName?: string | null;
  quantity?: number | null;
};

type Order = {
  id: string;
  orderNumber?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  status?: string | null;
  finalTotal?: number | string | null;
  requestedPickupTime?: string | null;
  createdAt?: string | null;
  items?: OrderItem[] | null;
};

type User = {
  createdAt?: string | null;
};

type MenuItem = {
  isAvailable?: boolean | null;
  isActive?: boolean | null;
  isDeleted?: boolean | null;
};

type DashboardData = {
  locationId?: string;
  recentOrders: Order[];
  paidOrders: Order[];
  todaysOrders: Order[];
  todaysSales: number;
  openOrderCount: number;
  customerCount?: number;
  newCustomerCount: number;
  unavailableMenuCount: number;
  loadError?: string;
};

const operationalStatuses = ["PAID", "PREPARING", "READY"];
const saleStatuses = ["PAID", "PREPARING", "READY", "COMPLETED"];

const currencyFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

const numberFormatter = new Intl.NumberFormat("en-CA");

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildUrl(path: string, params?: Record<string, string | number | undefined>) {
  const url = new URL(`${backendBaseUrl}${path}`);

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url;
}

async function fetchBackend<T>(path: string, token: string | undefined, params?: Record<string, string | number | undefined>) {
  if (!token) {
    return null;
  }

  const response = await fetch(buildUrl(path, params), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  return (await response.json().catch(() => null)) as T | null;
}

async function resolveLocationId(token: string | undefined, params: SearchParams | undefined) {
  const locationId = firstParam(params?.locationId);
  if (locationId) {
    return locationId;
  }

  const locationCode = firstParam(params?.locationCode);
  if (!locationCode) {
    return undefined;
  }

  const resolved = await fetchBackend<{ id?: string }>("/locations/resolve-id", token, { locationCode });
  return resolved?.id;
}

async function fetchOrderPage(
  token: string | undefined,
  locationId: string | undefined,
  params: Record<string, string | number | undefined>,
) {
  return (
    (await fetchBackend<PageResponse<Order>>("/orders", token, {
      page: 0,
      sort: "createdAt,desc",
      locationId,
      ...params,
    })) ?? { content: [], totalElements: 0 }
  );
}

async function getDashboardData(searchParams?: SearchParams): Promise<DashboardData> {
  const token = (await cookies()).get("umika_access_token")?.value;

  if (!token) {
    return {
      recentOrders: [],
      paidOrders: [],
      todaysOrders: [],
      todaysSales: 0,
      openOrderCount: 0,
      newCustomerCount: 0,
      unavailableMenuCount: 0,
      loadError: "Sign in with a manager or staff account to load live dashboard data.",
    };
  }

  const locationId = await resolveLocationId(token, searchParams);
  const [recentOrdersPage, paidOrdersPage, openCounts, usersPage, recentUsersPage, menuItemsPage] = await Promise.all([
    fetchOrderPage(token, locationId, { size: 80 }),
    fetchOrderPage(token, locationId, { size: 6, status: "PAID" }),
    Promise.all(operationalStatuses.map((status) => fetchOrderPage(token, locationId, { size: 1, status }))),
    fetchBackend<PageResponse<User>>("/users", token, { page: 0, size: 1, sort: "createdAt,desc" }),
    fetchBackend<PageResponse<User>>("/users", token, { page: 0, size: 50, sort: "createdAt,desc" }),
    fetchBackend<PageResponse<MenuItem>>("/menu-items", token, { page: 0, size: 300, sort: "displayOrder,asc" }),
  ]);

  const recentOrders = recentOrdersPage.content ?? [];
  const todaysOrders = recentOrders.filter((order) => isToday(order.createdAt));
  const todaysSales = todaysOrders
    .filter((order) => saleStatuses.includes(normalizeStatus(order.status)))
    .reduce((sum, order) => sum + toNumber(order.finalTotal), 0);
  const openOrderCount = openCounts.reduce((sum, page) => sum + (page.totalElements ?? 0), 0);
  const recentUsers = recentUsersPage?.content ?? [];
  const menuItems = menuItemsPage?.content ?? [];

  return {
    locationId,
    recentOrders: recentOrders.slice(0, 8),
    paidOrders: paidOrdersPage.content ?? [],
    todaysOrders,
    todaysSales,
    openOrderCount,
    customerCount: usersPage?.totalElements,
    newCustomerCount: recentUsers.filter((user) => isToday(user.createdAt)).length,
    unavailableMenuCount: menuItems.filter(
      (item) => item.isDeleted !== true && (item.isActive === false || item.isAvailable === false),
    ).length,
  };
}

function normalizeStatus(status?: string | null) {
  return (status ?? "UNKNOWN").toUpperCase();
}

function toNumber(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function isToday(value?: string | null) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function formatTime(value?: string | null) {
  if (!value) {
    return "No time set";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No time set";
  }

  return new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function displayCustomer(order: Order) {
  return order.customerName?.trim() || order.customerEmail?.trim() || "Guest customer";
}

function itemSummary(order: Order) {
  const items = order.items ?? [];
  const count = items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0);
  const names = items
    .slice(0, 2)
    .map((item) => item.itemName)
    .filter(Boolean)
    .join(", ");

  if (!names) {
    return `${count || 0} item${count === 1 ? "" : "s"}`;
  }

  return `${count || items.length} item${count === 1 ? "" : "s"}: ${names}${items.length > 2 ? "..." : ""}`;
}

function orderUrl(order?: Order, locationId?: string) {
  const params = new URLSearchParams();

  if (order?.id) {
    params.set("orderId", order.id);
  }

  if (locationId) {
    params.set("locationId", locationId);
  }

  const query = params.toString();
  return `/manager/orders${query ? `?${query}` : ""}`;
}

function StatusBadge({ status }: { status?: string | null }) {
  const normalized = normalizeStatus(status);
  const className =
    normalized === "PAID"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : normalized === "PREPARING"
        ? "border-sky-200 bg-sky-50 text-sky-800"
        : normalized === "READY"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : normalized === "COMPLETED"
            ? "border-slate-200 bg-slate-100 text-slate-700"
            : "border-rose-200 bg-rose-50 text-rose-800";

  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold", className)}>
      {normalized.replace("_", " ")}
    </span>
  );
}

export default async function ManagerDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const locale = await getCurrentLocale();
  const dict = getDictionary(locale);
  const resolvedSearchParams = await searchParams;
  const dashboard = await getDashboardData(resolvedSearchParams);
  const paidWaiting = dashboard.paidOrders.length;

  const stats = [
    {
      label: "Today's sales",
      value: currencyFormatter.format(dashboard.todaysSales),
      detail: `${numberFormatter.format(dashboard.todaysOrders.length)} order${
        dashboard.todaysOrders.length === 1 ? "" : "s"
      } today`,
      icon: DollarSign,
    },
    {
      label: "Open orders",
      value: numberFormatter.format(dashboard.openOrderCount),
      detail: `${paidWaiting} paid waiting for acceptance`,
      icon: ShoppingBag,
    },
    {
      label: "Customers",
      value: dashboard.customerCount === undefined ? "N/A" : numberFormatter.format(dashboard.customerCount),
      detail: `${dashboard.newCustomerCount} new today`,
      icon: Users,
    },
    {
      label: "Menu attention",
      value: numberFormatter.format(dashboard.unavailableMenuCount),
      detail: "Unavailable or inactive items",
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        eyebrow={dict.manager.dashboard.eyebrow}
        title="Operations dashboard"
        description="Live order, customer, and menu signals for the current location."
        actions={
          <>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href={orderUrl(undefined, dashboard.locationId)}>
                <ClipboardList className="h-4 w-4" />
                Orders
              </Link>
            </Button>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/manager/menus">
                Menu
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </>
        }
      />

      {dashboard.loadError ? (
        <Card className="rounded-md border-amber-200 bg-amber-50 shadow-none">
          <CardContent className="flex items-start gap-3 p-5 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{dashboard.loadError}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Card key={stat.label} className="rounded-md shadow-none">
              <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
                <CardTitle className="text-sm text-slate-600">{stat.label}</CardTitle>
                <span className="rounded-md border border-slate-200 bg-slate-50 p-2 text-slate-600">
                  <Icon className="h-4 w-4" />
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-slate-950">{stat.value}</p>
                <p className="mt-2 text-sm text-slate-500">{stat.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-md shadow-none">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock3 className="h-4 w-4 text-primary" />
              Paid Orders Waiting
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {dashboard.paidOrders.length === 0 ? (
              <div className="flex items-center gap-3 p-5 text-sm text-slate-500">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                No paid orders are waiting for acceptance.
              </div>
            ) : (
              dashboard.paidOrders.map((order) => (
                <Link
                  key={order.id}
                  href={orderUrl(order, dashboard.locationId)}
                  className="grid gap-3 border-b border-slate-200 p-5 transition-colors last:border-b-0 hover:bg-slate-50 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-950">{displayCustomer(order)}</p>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Pickup {formatTime(order.requestedPickupTime)} · {itemSummary(order)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="text-sm font-semibold text-slate-950">
                      {currencyFormatter.format(toNumber(order.finalTotal))}
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-md shadow-none">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-base">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {dashboard.recentOrders.length === 0 ? (
              <div className="p-5 text-sm text-slate-500">No recent orders found.</div>
            ) : (
              dashboard.recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={orderUrl(order, dashboard.locationId)}
                  className="grid gap-3 border-b border-slate-200 p-5 transition-colors last:border-b-0 hover:bg-slate-50 min-[520px]:grid-cols-[1fr_auto] min-[520px]:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-slate-950">{displayCustomer(order)}</p>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {order.orderNumber ? `${order.orderNumber} · ` : ""}
                      {formatTime(order.createdAt)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-slate-950">
                    {currencyFormatter.format(toNumber(order.finalTotal))}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
