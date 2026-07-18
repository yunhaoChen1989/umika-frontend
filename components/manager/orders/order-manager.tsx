"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Bell, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Minus, Plus, Printer, RefreshCw, RotateCcw, Search, Volume2 } from "lucide-react";

import { LoginRedirectLink } from "@/components/auth/login-redirect-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCartOptions } from "@/lib/cart-options";
import type { CheckoutOrderItemResponse, CheckoutResponse } from "@/lib/cart-types";
import type { LocationDto } from "@/lib/location-types";
import { cn } from "@/lib/utils";

type OrderStatus = "PENDING" | "PAID" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED" | "PARTIALLY_REFUNDED" | "REFUNDED";
type DateMode = "exact" | "range";
type StripeRefundReason = "REQUESTED_BY_CUSTOMER" | "DUPLICATE" | "FRAUDULENT";

type OrderInquiryFilters = {
  email: string;
  customerName: string;
  phone: string;
  notes: string;
  dateMode: DateMode;
  orderDate: string;
  orderDateFrom: string;
  orderDateTo: string;
  locationId: string;
  status: string;
};

type SpringPage<T> = {
  content?: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
};

type OrderRefundDto = {
  id?: string | null;
  orderId?: string | null;
  amount?: number | string | null;
  reason?: string | null;
  stripeReason?: string | null;
  status?: string | null;
  idempotencyKey?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  [key: string]: unknown;
};

type RefundPayload = {
  amount?: number;
  reason: string;
  stripeReason: StripeRefundReason;
  idempotencyKey: string;
};

const ORDER_STATUSES: OrderStatus[] = ["PENDING", "PAID", "PREPARING", "READY", "COMPLETED", "CANCELLED", "PARTIALLY_REFUNDED", "REFUNDED"];
const MANUAL_ORDER_STATUSES: OrderStatus[] = ["PENDING", "PAID", "PREPARING", "READY", "COMPLETED", "CANCELLED"];
const STRIPE_REFUND_REASONS: StripeRefundReason[] = ["REQUESTED_BY_CUSTOMER", "DUPLICATE", "FRAUDULENT"];
const ORDER_NOTIFICATION_WS_URL = process.env.NEXT_PUBLIC_ORDER_NOTIFICATION_WS_URL?.trim();
const ORDER_NOTIFICATION_WS_PREFIX = (process.env.NEXT_PUBLIC_ORDER_NOTIFICATION_WS_PREFIX ?? "/api/v1").replace(/\/$/, "");
const emptyInquiryFilters: OrderInquiryFilters = {
  email: "",
  customerName: "",
  phone: "",
  notes: "",
  dateMode: "exact",
  orderDate: "",
  orderDateFrom: "",
  orderDateTo: "",
  locationId: "",
  status: "",
};

const statusClasses: Record<string, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-800",
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-800",
  PREPARING: "border-sky-200 bg-sky-50 text-sky-800",
  READY: "border-primary/20 bg-primary/10 text-primary",
  COMPLETED: "border-slate-200 bg-slate-100 text-slate-700",
  CANCELLED: "border-destructive/30 bg-destructive/10 text-destructive",
  PARTIALLY_REFUNDED: "border-violet-200 bg-violet-50 text-violet-800",
  REFUNDED: "border-violet-200 bg-violet-100 text-violet-900",
};

export function OrderManager() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<CheckoutResponse[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [detailOrderId, setDetailOrderId] = useState("");
  const [filters, setFilters] = useState<OrderInquiryFilters>(emptyInquiryFilters);
  const [appliedFilters, setAppliedFilters] = useState<OrderInquiryFilters>(emptyInquiryFilters);
  const [headerLocationId, setHeaderLocationId] = useState("");
  const [isLocationContextReady, setIsLocationContextReady] = useState(false);
  const [locations, setLocations] = useState<LocationDto[]>([]);
  const [locationLoadError, setLocationLoadError] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize] = useState(50);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "unauthenticated" | "error">("idle");
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeAlertOrderId, setActiveAlertOrderId] = useState<string | null>(null);
  const [latestNotification, setLatestNotification] = useState<OrderNotificationPayload | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeAlertOrderIdRef = useRef<string | null>(null);
  const startupSoundAttemptedRef = useRef(false);

  const detailOrder = useMemo(
    () => orders.find((order) => getOrderId(order) === detailOrderId) ?? null,
    [orders, detailOrderId],
  );
  const locationContext = useMemo(() => getStoredLocationContext(searchParams), [searchParams]);
  const locationKey = `${locationContext.locationId ?? ""}:${locationContext.locationCode ?? ""}`;

  useEffect(() => {
    let active = true;

    async function syncHeaderLocation() {
      setIsLocationContextReady(false);
      const locationId = await resolveLocationId(locationContext);

      if (!active) {
        return;
      }

      if (!locationId && locationContext.locationCode) {
        setHeaderLocationId("");
        setIsLocationContextReady(true);
        setOrders([]);
        setSelectedOrderId("");
        setDetailOrderId("");
        setPageNumber(0);
        setTotalElements(0);
        setTotalPages(0);
        setStatus("error");
        setError("Unable to resolve the selected header location. Please choose the location again.");
        return;
      }

      setHeaderLocationId(locationId);
      setIsLocationContextReady(true);
      const nextFilters = { ...emptyInquiryFilters, locationId };
      setFilters(nextFilters);
      setAppliedFilters(nextFilters);
      setOrders([]);
      setSelectedOrderId("");
      setDetailOrderId("");
      setPageNumber(0);
      setTotalElements(0);
      setTotalPages(0);
      setStatus("idle");
      setMessage(null);
      setError(null);
      setDialogError(null);
    }

    void syncHeaderLocation();

    return () => {
      active = false;
    };
  }, [locationContext, locationKey]);

  useEffect(() => {
    const responsePromise = fetch("/api/manager/locations?page=0&size=300&sort=name,asc", {
      method: "GET",
      headers: getAuthHeaders(),
      cache: "no-store",
    }).catch(() => null);

    void responsePromise.then(async (response) => {
      if (!response?.ok) {
        const body = response ? await response.json().catch(() => null) : null;
        setLocationLoadError(getApiErrorMessage(body, "Unable to load location selector."));
        return;
      }

      const body = (await response.json().catch(() => null)) as SpringPage<LocationDto> | LocationDto[] | null;
      setLocations(Array.isArray(body) ? body : body?.content ?? []);
      setLocationLoadError(null);
    });
  }, []);

  useEffect(() => {
    activeAlertOrderIdRef.current = activeAlertOrderId;
  }, [activeAlertOrderId]);

  useEffect(() => {
    if (!soundEnabled || startupSoundAttemptedRef.current) {
      return;
    }

    startupSoundAttemptedRef.current = true;
    playOrderNotificationSound(true);
  }, [soundEnabled]);

  useEffect(() => {
    if (!soundEnabled || !activeAlertOrderId) {
      return;
    }

    playOrderNotificationSound(true);
    const interval = window.setInterval(() => {
      if (activeAlertOrderIdRef.current) {
        playOrderNotificationSound(true);
      }
    }, 2500);

    return () => window.clearInterval(interval);
  }, [activeAlertOrderId, soundEnabled]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let closedByEffect = false;

    async function connect() {
      const locationId = await resolveLocationId(locationContext);

      if (closedByEffect) {
        return;
      }

      if (!locationId && locationContext.locationCode) {
        setLiveStatus("disconnected");
        return;
      }

      setLiveStatus("connecting");
      socket = new WebSocket(buildOrderNotificationWsUrl(locationId));

      socket.onopen = () => setLiveStatus("connected");
      socket.onclose = () => {
        setLiveStatus("disconnected");
        if (!closedByEffect) {
          reconnectTimeout = setTimeout(() => void connect(), 3000);
        }
      };
      socket.onerror = () => {
        setLiveStatus("disconnected");
      };
      socket.onmessage = (event) => {
        const payload = parseOrderNotification(event.data);
        if (!payload?.order) {
          return;
        }

        setLatestNotification(payload);
        upsertOrder(payload.order);
        setSelectedOrderId(getOrderId(payload.order));
        if (payload.requiresAcceptance && (payload.order.status ?? "").toUpperCase() === "PAID") {
          setActiveAlertOrderId(getOrderId(payload.order));
        } else if ((payload.order.status ?? "").toUpperCase() !== "PAID") {
          setActiveAlertOrderId((current) => (current === getOrderId(payload.order) ? null : current));
        }
        if (payload.type !== "ORDER_STATUS_UPDATED") {
          setDetailOrderId(getOrderId(payload.order));
        }
      };
    }

    void connect();

    return () => {
      closedByEffect = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      socket?.close();
    };
  }, [locationContext, locationKey, soundEnabled]);

  const loadOrders = useCallback(async (page: number, activeFilters: OrderInquiryFilters) => {
    setStatus("loading");
    setMessage(null);
    setError(null);

    const url = new URL("/api/orders", window.location.origin);
    const normalizedFilters = normalizeInquiryFilters(activeFilters);
    const setIfPresent = (key: string, value: string) => {
      if (value.trim()) {
        url.searchParams.set(key, value.trim());
      }
    };

    setIfPresent("email", normalizedFilters.email);
    setIfPresent("customerName", normalizedFilters.customerName);
    setIfPresent("phone", normalizedFilters.phone);
    setIfPresent("notes", normalizedFilters.notes);
    setIfPresent("locationId", normalizedFilters.locationId);
    setIfPresent("status", normalizedFilters.status);

    if (normalizedFilters.dateMode === "exact") {
      setIfPresent("orderDate", normalizedFilters.orderDate);
    } else {
      setIfPresent("orderDateFrom", normalizedFilters.orderDateFrom);
      setIfPresent("orderDateTo", normalizedFilters.orderDateTo);
    }

    url.searchParams.set("page", String(Math.max(0, page)));
    url.searchParams.set("size", String(pageSize));
    url.searchParams.set("sort", "createdAt,desc");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: getAuthHeaders(),
      cache: "no-store",
    }).catch(() => null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setOrders([]);
      setSelectedOrderId("");
      setDetailOrderId("");
      setStatus(response?.status === 401 || response?.status === 403 ? "unauthenticated" : "error");
      setError(getApiErrorMessage(body, "Unable to load orders. Your account may not have permission for this search."));
      return;
    }

    const body = (await response.json().catch(() => null)) as SpringPage<CheckoutResponse> | CheckoutResponse[] | null;
    const loadedOrders = Array.isArray(body) ? body : body?.content ?? [];
    const nextPageNumber = Array.isArray(body) ? 0 : body?.number ?? page;
    const nextTotalPages = Array.isArray(body) ? (loadedOrders.length > 0 ? 1 : 0) : body?.totalPages ?? 0;

    setOrders(loadedOrders);
    setSelectedOrderId("");
    setDetailOrderId("");
    setPageNumber(nextPageNumber);
    setTotalElements(Array.isArray(body) ? loadedOrders.length : body?.totalElements ?? loadedOrders.length);
    setTotalPages(nextTotalPages);
    setStatus(loadedOrders.length > 0 ? "ready" : "idle");
    setMessage(loadedOrders.length === 0 ? "No orders found." : null);
  }, [pageSize]);

  useEffect(() => {
    if (!isLocationContextReady) {
      return;
    }

    void loadOrders(0, appliedFilters);
  }, [appliedFilters, isLocationContextReady, loadOrders, locationKey]);

  function searchOrders(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const nextFilters = normalizeInquiryFilters(filters);
    setAppliedFilters(nextFilters);
    void loadOrders(0, nextFilters);
  }

  function resetFilters() {
    const nextFilters = { ...emptyInquiryFilters, locationId: headerLocationId };
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    void loadOrders(0, nextFilters);
  }

  async function acceptOrder(order: CheckoutResponse, requestedPickupTime?: string) {
    const orderId = getOrderId(order);

    if (!orderId) {
      return;
    }

    setAcceptingId(orderId);
    setMessage(null);
    setError(null);
    setDialogError(null);

    const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/status`, {
      method: "PATCH",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "PREPARING",
        note: "Accepted by staff. Pickup time confirmed.",
        requestedPickupTime: requestedPickupTime || undefined,
      }),
      cache: "no-store",
    }).catch(() => null);

    setAcceptingId(null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      const message = getApiErrorMessage(body, "Unable to accept order.");
      setError(message);
      setDialogError(message);
      return;
    }

    const updatedOrder = (await response.json().catch(() => null)) as CheckoutResponse | null;
    if (updatedOrder && getOrderId(updatedOrder)) {
      upsertOrder(updatedOrder);
      setActiveAlertOrderId((current) => (current === orderId ? null : current));
      setLatestNotification((current) =>
        current && current.orderId === orderId
          ? { ...current, requiresAcceptance: false, type: "ORDER_STATUS_UPDATED", status: updatedOrder.status ?? "PREPARING", order: updatedOrder }
          : current,
      );
    }
    setMessage(`Order ${order.orderNumber ?? orderId} accepted.`);
    setDialogError(null);
    setDetailOrderId("");
  }

  async function updateOrderStatus(order: CheckoutResponse, nextStatus: OrderStatus, note?: string) {
    const orderId = getOrderId(order);

    if (!orderId) {
      return;
    }

    setUpdatingStatusId(orderId);
    setMessage(null);
    setError(null);
    setDialogError(null);

    const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/status`, {
      method: "PATCH",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: nextStatus,
        note: note?.trim() || `Status updated to ${nextStatus}`,
      }),
      cache: "no-store",
    }).catch(() => null);

    setUpdatingStatusId(null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      const message = getApiErrorMessage(body, "Unable to update order status.");
      setError(message);
      setDialogError(message);
      return;
    }

    const updatedOrder = (await response.json().catch(() => null)) as CheckoutResponse | null;
    if (updatedOrder && getOrderId(updatedOrder)) {
      upsertOrder(updatedOrder);
      setActiveAlertOrderId((current) => (current === orderId && (updatedOrder.status ?? "").toUpperCase() !== "PAID" ? null : current));
      setLatestNotification((current) =>
        current && current.orderId === orderId
          ? { ...current, type: "ORDER_STATUS_UPDATED", status: updatedOrder.status ?? nextStatus, order: updatedOrder }
          : current,
      );
    }
    setMessage(`Order ${order.orderNumber ?? orderId} status updated to ${nextStatus}.`);
    setDialogError(null);
  }

  async function refundOrder(order: CheckoutResponse, payload: RefundPayload) {
    const orderId = getOrderId(order);

    if (!orderId) {
      return;
    }

    setRefundingId(orderId);
    setMessage(null);
    setError(null);
    setDialogError(null);

    const body: Record<string, unknown> = {
      reason: payload.reason,
      stripeReason: payload.stripeReason,
      idempotencyKey: payload.idempotencyKey,
    };

    if (typeof payload.amount === "number" && Number.isFinite(payload.amount) && payload.amount > 0) {
      body.amount = payload.amount;
    }

    const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/refunds`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    }).catch(() => null);

    setRefundingId(null);

    if (!response?.ok) {
      const responseBody = response ? await response.json().catch(() => null) : null;
      const message = getApiErrorMessage(responseBody, "Unable to refund this order.");
      setError(message);
      setDialogError(message);
      throw new Error(message);
    }

    setMessage(`Refund submitted for order ${order.orderNumber ?? orderId}.`);
    setDialogError(null);
    await loadOrders(pageNumber, appliedFilters);
  }


  function upsertOrder(order: CheckoutResponse) {
    const orderId = getOrderId(order);

    if (!orderId) {
      return;
    }

    setOrders((current) => {
      const exists = current.some((item) => getOrderId(item) === orderId);
      const nextOrders = exists ? current.map((item) => (getOrderId(item) === orderId ? order : item)) : [order, ...current];
      return nextOrders.slice(0, 50);
    });
    setStatus((current) => (current === "unauthenticated" ? current : "ready"));
  }

  if (status === "unauthenticated") {
    return (
      <Card className="rounded-md shadow-none">
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">{error ?? "Log in with a manager account to view orders."}</p>
          <Button asChild className="w-full sm:w-auto">
            <LoginRedirectLink>Login</LoginRedirectLink>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}
      {message ? (
        <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{message}</p>
        </div>
      ) : null}

      <Card className="rounded-md shadow-none">
        <CardContent className="flex flex-col gap-3 pt-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <Bell className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-950">Live order notifications</p>
              <p className="mt-1 text-sm text-slate-500">
                {latestNotification
                  ? `${latestNotification.orderNumber ?? latestNotification.orderId} · ${formatNotificationType(latestNotification)}`
                  : `WebSocket ${liveStatus}`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn("rounded-md", liveStatus === "connected" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800")}>
              {liveStatus}
            </Badge>
            <Button
              onClick={() => {
                setSoundEnabled(true);
                playOrderNotificationSound(true);
              }}
              type="button"
              variant={soundEnabled ? "default" : "outline"}
            >
              <Volume2 className="h-4 w-4" />
              {soundEnabled ? "Sound on" : "Enable sound"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-md shadow-none">
        <CardHeader className="border-b border-slate-200">
          <CardTitle className="text-base">Order filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 xl:grid-cols-4" onSubmit={(event) => void searchOrders(event)}>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Date mode</span>
              <select
                className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                onChange={(event) => setFilters((current) => ({ ...current, dateMode: event.target.value as DateMode }))}
                value={filters.dateMode}
              >
                <option value="exact">Exact date</option>
                <option value="range">Date range</option>
              </select>
            </label>
            {filters.dateMode === "exact" ? (
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Order date</span>
                <input
                  className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  onChange={(event) => setFilters((current) => ({ ...current, orderDate: event.target.value }))}
                  type="date"
                  value={filters.orderDate}
                />
              </label>
            ) : (
              <>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Date from</span>
                  <input
                    className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    onChange={(event) => setFilters((current) => ({ ...current, orderDateFrom: event.target.value }))}
                    type="date"
                    value={filters.orderDateFrom}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Date to</span>
                  <input
                    className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    onChange={(event) => setFilters((current) => ({ ...current, orderDateTo: event.target.value }))}
                    type="date"
                    value={filters.orderDateTo}
                  />
                </label>
              </>
            )}
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Customer name</span>
              <input
                className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                onChange={(event) => setFilters((current) => ({ ...current, customerName: event.target.value }))}
                placeholder="Optional name"
                value={filters.customerName}
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Customer email</span>
              <input
                className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                onChange={(event) => setFilters((current) => ({ ...current, email: event.target.value }))}
                placeholder="Optional customer email"
                type="email"
                value={filters.email}
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Phone</span>
              <input
                className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                onChange={(event) => setFilters((current) => ({ ...current, phone: event.target.value }))}
                placeholder="Optional phone"
                value={filters.phone}
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Notes</span>
              <input
                className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                onChange={(event) => setFilters((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Customer or internal notes"
                value={filters.notes}
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Location</span>
              <select
                className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                onChange={(event) => setFilters((current) => ({ ...current, locationId: event.target.value }))}
                value={filters.locationId}
              >
                <option value="">All permitted locations</option>
                {locations.map((location) => {
                  const locationId = getLocationId(location);
                  return locationId ? (
                    <option key={locationId} value={locationId}>
                      {location.name}{location.locationCode ? ` (${location.locationCode})` : ""}
                    </option>
                  ) : null;
                })}
                {filters.locationId && !locations.some((location) => getLocationId(location) === filters.locationId) ? (
                  <option value={filters.locationId}>Selected header location</option>
                ) : null}
              </select>
              {locationLoadError ? <span className="mt-1 block text-xs text-amber-700">{locationLoadError}</span> : null}
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Status</span>
              <select
                className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                value={filters.status}
              >
                <option value="">All statuses</option>
                {ORDER_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {formatStatus(item)}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-2 sm:flex-row xl:col-span-4">
              <Button disabled={status === "loading"} type="submit">
                <Search className="h-4 w-4" />
                {status === "loading" ? "Searching..." : "Search"}
              </Button>
              <Button disabled={status === "loading"} onClick={() => void loadOrders(pageNumber, appliedFilters)} type="button" variant="outline">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button disabled={status === "loading"} onClick={resetFilters} type="button" variant="outline">
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-md shadow-none">
        <CardHeader className="border-b border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4 text-primary" />
              Orders
            </CardTitle>
            <p className="text-sm text-slate-500">
              {totalElements} total
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">No orders found. Adjust filters or wait for live paid orders.</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {orders.map((order) => {
                const orderId = getOrderId(order);
                return (
                  <OrderListRow
                    key={orderId || order.orderNumber || Math.random()}
                    onOpen={() => {
                      setSelectedOrderId(orderId);
                      setDetailOrderId(orderId);
                    }}
                    order={order}
                    selected={orderId === selectedOrderId}
                  />
                );
              })}
            </div>
          )}
          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Page {totalPages === 0 ? 0 : pageNumber + 1} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button disabled={status === "loading" || pageNumber <= 0} onClick={() => void loadOrders(pageNumber - 1, appliedFilters)} type="button" variant="outline">
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button disabled={status === "loading" || pageNumber + 1 >= totalPages} onClick={() => void loadOrders(pageNumber + 1, appliedFilters)} type="button" variant="outline">
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <ManagerOrderDetailsDialog
        acceptingId={acceptingId}
        error={dialogError}
        order={detailOrder}
        refundingId={refundingId}
        updatingStatusId={updatingStatusId}
        onAccept={(order, requestedPickupTime) => void acceptOrder(order, requestedPickupTime)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailOrderId("");
            setDialogError(null);
          }
        }}
        onRefund={(order, payload) => refundOrder(order, payload)}
        onUpdateStatus={(order, nextStatus, note) => void updateOrderStatus(order, nextStatus, note)}
      />
    </div>
  );
}

type OrderNotificationPayload = {
  type?: string;
  orderId?: string;
  locationId?: string | null;
  orderNumber?: string | null;
  status?: string | null;
  autoAccepted?: boolean;
  requiresAcceptance?: boolean;
  order?: CheckoutResponse;
  createdAt?: string | null;
};

function ManagerOrderDetailsDialog({
  acceptingId,
  error,
  order,
  refundingId,
  updatingStatusId,
  onAccept,
  onOpenChange,
  onRefund,
  onUpdateStatus,
}: {
  acceptingId: string | null;
  error: string | null;
  order: CheckoutResponse | null;
  refundingId: string | null;
  updatingStatusId: string | null;
  onAccept: (order: CheckoutResponse, requestedPickupTime?: string) => void;
  onOpenChange: (open: boolean) => void;
  onRefund: (order: CheckoutResponse, payload: RefundPayload) => Promise<void>;
  onUpdateStatus: (order: CheckoutResponse, nextStatus: OrderStatus, note?: string) => void;
}) {
  const items = order?.items ?? [];
  const orderId = order ? getOrderId(order) : "";
  const [pickupTime, setPickupTime] = useState("");
  const [statusDraft, setStatusDraft] = useState<OrderStatus>("PENDING");
  const [statusNote, setStatusNote] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [stripeReason, setStripeReason] = useState<StripeRefundReason>("REQUESTED_BY_CUSTOMER");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [refunds, setRefunds] = useState<OrderRefundDto[]>([]);
  const [refundStatus, setRefundStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [refundError, setRefundError] = useState<string | null>(null);
  const isWaitingForAcceptance = (order?.status ?? "").toUpperCase() === "PAID";
  const canRefund = Boolean(orderId) && !["PENDING", "CANCELLED", "REFUNDED"].includes((order?.status ?? "").toUpperCase());

  useEffect(() => {
    setPickupTime(toPickupTimeValue(order?.requestedPickupTime));
    setStatusDraft(normalizeOrderStatus(order?.status));
    setStatusNote("");
    setRefundAmount("");
    setRefundReason("");
    setStripeReason("REQUESTED_BY_CUSTOMER");
    setIdempotencyKey(orderId ? buildRefundIdempotencyKey(orderId) : "");
  }, [order?.requestedPickupTime, order?.status, orderId]);

  useEffect(() => {
    let active = true;

    async function loadRefunds() {
      if (!orderId) {
        setRefunds([]);
        setRefundStatus("idle");
        setRefundError(null);
        return;
      }

      setRefundStatus("loading");
      setRefundError(null);

      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/refunds`, {
        method: "GET",
        headers: getAuthHeaders(),
        cache: "no-store",
      }).catch(() => null);

      if (!active) {
        return;
      }

      if (!response?.ok) {
        const body = response ? await response.json().catch(() => null) : null;
        setRefunds([]);
        setRefundStatus("error");
        setRefundError(getApiErrorMessage(body, "Unable to load refund history."));
        return;
      }

      const body = (await response.json().catch(() => null)) as SpringPage<OrderRefundDto> | OrderRefundDto[] | null;
      setRefunds(Array.isArray(body) ? body : body?.content ?? []);
      setRefundStatus("ready");
    }

    void loadRefunds();

    return () => {
      active = false;
    };
  }, [orderId]);

  async function submitRefund(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!order) {
      return;
    }

    const amountText = refundAmount.trim();
    const amount = amountText ? Number(amountText) : undefined;

    if (amountText && (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0)) {
      setRefundError("Refund amount must be greater than 0, or leave it empty for the remaining balance.");
      return;
    }

    const reason = refundReason.trim();
    const key = idempotencyKey.trim();

    if (!reason) {
      setRefundError("Refund reason is required.");
      return;
    }

    if (!key) {
      setRefundError("Idempotency key is required.");
      return;
    }

    setRefundError(null);

    try {
      await onRefund(order, {
        amount,
        reason,
        stripeReason,
        idempotencyKey: key,
      });
      setRefundAmount("");
      setRefundReason("");
      setIdempotencyKey(buildRefundIdempotencyKey(orderId));

      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/refunds`, {
        method: "GET",
        headers: getAuthHeaders(),
        cache: "no-store",
      }).catch(() => null);

      if (response?.ok) {
        const body = (await response.json().catch(() => null)) as SpringPage<OrderRefundDto> | OrderRefundDto[] | null;
        setRefunds(Array.isArray(body) ? body : body?.content ?? []);
        setRefundStatus("ready");
      }
    } catch (submitError) {
      setRefundError(getErrorText(submitError) ?? "Unable to refund this order.");
    }
  }

  return (
    <Dialog open={Boolean(order)} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,56rem)]">
        {order ? (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <DialogTitle>{order.orderNumber ?? orderId}</DialogTitle>
                  <DialogDescription>
                    {formatDateTime(order.createdAt)} · {formatOrderType(order.orderType)}
                  </DialogDescription>
                </div>
                <PrintOrderButton order={order} />
              </div>
            </DialogHeader>
            <div className="space-y-5 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={order.status ?? "PENDING"} />
                <span className="text-sm text-slate-500">
                  {isWaitingForAcceptance ? "Waiting for staff acceptance" : "Backend order snapshot"}
                </span>
              </div>

              {error ? (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{error}</p>
                </div>
              ) : null}

              <div className="rounded-md border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-100 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Items</div>
                <div className="divide-y divide-slate-200">
                  {items.map((item, index) => (
                    <OrderItemRow item={item} key={item.id ?? `${item.menuItemId}-${index}`} />
                  ))}
                  {items.length === 0 ? <div className="p-4 text-sm text-slate-500">No item snapshots returned.</div> : null}
                </div>
              </div>

              {order.customerNote ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Customer note</p>
                  <p className="mt-2 text-sm font-medium text-amber-950">{order.customerNote}</p>
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <SummaryTile label="Customer" value={getCustomerName(order)} />
                <SummaryTile label="Email" value={getCustomerEmail(order)} />
                <SummaryTile label="Order number" value={order.orderNumber ?? orderId ?? "Unknown"} />
                <SummaryTile label="Type" value={formatOrderType(order.orderType)} />
                <SummaryTile label="Subtotal" value={formatMoney(order.subtotal)} />
                <SummaryTile label="Final total" value={formatMoney(order.finalTotal ?? order.total)} />
                <SummaryTile label="Discount" value={formatMoney(order.totalDiscount)} />
                <SummaryTile label="Reward discount" value={formatMoney(order.rewardDiscountAmount)} />
                <SummaryTile label="Tax" value={`${formatMoney(order.taxAmount ?? order.tax)} / ${formatPercent(order.taxRate)}`} />
                <SummaryTile label="Points" value={`${order.pointsRedeemed ?? 0} redeemed / ${order.pointsEarned ?? 0} earned`} />
              </div>

              <div className="rounded-md border border-slate-200 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                      <RotateCcw className="h-4 w-4 text-primary" />
                      Refund
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Leave amount empty to refund the full remaining Stripe balance.</p>
                  </div>
                  <Badge className="w-fit rounded-md border-slate-200 bg-slate-100 text-slate-700">
                    {refunds.length} refund{refunds.length === 1 ? "" : "s"}
                  </Badge>
                </div>

                {refundError ? (
                  <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{refundError}</p>
                  </div>
                ) : null}

                <form className="mt-3 grid gap-3 lg:grid-cols-[140px_1fr_220px] lg:items-end" onSubmit={(event) => void submitRefund(event)}>
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Amount</span>
                    <input
                      className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      min="0.01"
                      onChange={(event) => setRefundAmount(event.target.value)}
                      placeholder="Full"
                      step="0.01"
                      type="number"
                      value={refundAmount}
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Reason</span>
                    <input
                      className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      onChange={(event) => setRefundReason(event.target.value)}
                      placeholder="Customer requested refund"
                      value={refundReason}
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Stripe reason</span>
                    <select
                      className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      onChange={(event) => setStripeReason(event.target.value as StripeRefundReason)}
                      value={stripeReason}
                    >
                      {STRIPE_REFUND_REASONS.map((reason) => (
                        <option key={reason} value={reason}>
                          {formatRefundReason(reason)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block lg:col-span-2">
                    <span className="text-sm font-semibold text-slate-700">Idempotency key</span>
                    <input
                      className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      onChange={(event) => setIdempotencyKey(event.target.value)}
                      value={idempotencyKey}
                    />
                  </label>
                  <Button disabled={!canRefund || refundingId === orderId} type="submit">
                    <RotateCcw className="h-4 w-4" />
                    {refundingId === orderId ? "Refunding..." : canRefund ? "Submit refund" : "Refund unavailable"}
                  </Button>
                </form>

                <div className="mt-4 rounded-md border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">Refund history</div>
                  {refundStatus === "loading" ? (
                    <div className="p-3 text-sm text-slate-500">Loading refunds...</div>
                  ) : refunds.length === 0 ? (
                    <div className="p-3 text-sm text-slate-500">No refunds yet.</div>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {refunds.map((refund, index) => (
                        <div className="grid gap-2 p-3 text-sm sm:grid-cols-[120px_1fr_160px] sm:items-center" key={refund.id ?? refund.idempotencyKey ?? index}>
                          <p className="font-semibold text-slate-950">{formatMoney(refund.amount)}</p>
                          <div className="min-w-0">
                            <p className="truncate text-slate-700">{refund.reason || formatRefundReason(refund.stripeReason)}</p>
                            <p className="truncate text-xs text-slate-500">{refund.idempotencyKey ?? refund.id ?? "No idempotency key"}</p>
                          </div>
                          <div className="sm:text-right">
                            <Badge className="rounded-md border-violet-200 bg-violet-50 text-violet-800">{refund.status ?? "Refunded"}</Badge>
                            <p className="mt-1 text-xs text-slate-500">{formatDateTime(refund.createdAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {order.orderType === "PICKUP" && isWaitingForAcceptance ? (
                <div className="rounded-md border border-slate-200 p-4">
                  <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                    <label className="block">
                      <span className="text-sm font-semibold text-slate-700">Pickup time</span>
                      <div className="mt-2 grid grid-cols-[40px_1fr_40px] gap-2">
                        <Button aria-label="Subtract 5 minutes" onClick={() => setPickupTime((current) => adjustPickupTimeValue(current, -5))} size="icon" type="button" variant="outline">
                          <Minus className="h-4 w-4" />
                        </Button>
                        <input
                          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-center text-sm font-semibold outline-none focus:ring-2 focus:ring-ring"
                          onChange={(event) => setPickupTime(event.target.value)}
                          type="time"
                          value={pickupTime}
                        />
                        <Button aria-label="Add 5 minutes" onClick={() => setPickupTime((current) => adjustPickupTimeValue(current, 5))} size="icon" type="button" variant="outline">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </label>
                    <div className="flex items-center gap-2">
                      <PrintOrderButton order={order} />
                      <Button disabled={acceptingId === orderId} onClick={() => onAccept(order, fromPickupTimeValue(pickupTime, order.requestedPickupTime))} type="button">
                        {acceptingId === orderId ? "Accepting..." : "Accept order"}
                      </Button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Adjust the pickup time if needed, then accept to confirm it for the customer.</p>
                </div>
              ) : isWaitingForAcceptance ? (
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 p-4">
                  <PrintOrderButton order={order} />
                  <Button disabled={acceptingId === orderId} onClick={() => onAccept(order)} type="button">
                    {acceptingId === orderId ? "Accepting..." : "Accept order"}
                  </Button>
                </div>
              ) : null}

              <div className="rounded-md border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-950">Order status</p>
                <div className="mt-3 grid gap-3 lg:grid-cols-[220px_1fr_auto] lg:items-end">
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Status</span>
                    <select
                      className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      onChange={(event) => setStatusDraft(event.target.value as OrderStatus)}
                      value={statusDraft}
                    >
                      {!MANUAL_ORDER_STATUSES.includes(statusDraft) ? (
                        <option value={statusDraft}>{formatStatus(statusDraft)}</option>
                      ) : null}
                      {MANUAL_ORDER_STATUSES.map((item) => (
                        <option key={item} value={item}>
                          {formatStatus(item)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Note</span>
                    <input
                      className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      onChange={(event) => setStatusNote(event.target.value)}
                      placeholder="Optional status note"
                      value={statusNote}
                    />
                  </label>
                  <Button disabled={updatingStatusId === orderId} onClick={() => onUpdateStatus(order, statusDraft, statusNote)} type="button">
                    {updatingStatusId === orderId ? "Updating..." : "Update status"}
                  </Button>
                </div>
              </div>

            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function PrintOrderButton({ order }: { order: CheckoutResponse }) {
  return (
    <Button
      aria-label={`Print order ${order.orderNumber ?? getOrderId(order) ?? ""}`}
      onClick={() => undefined}
      size="icon"
      title="Print order"
      type="button"
      variant="outline"
    >
      <Printer className="h-4 w-4" />
    </Button>
  );
}

function OrderItemRow({ item }: { item: CheckoutOrderItemResponse }) {
  const optionSnapshot = getOrderItemOptionSnapshot(item);
  const itemOptions = formatCartOptions(optionSnapshot);
  const itemNote = getOrderItemNote(item) ?? itemOptions.note;
  const fallbackOptions = itemOptions.optionText || itemNote ? "" : formatOptions(optionSnapshot);

  return (
    <div className="grid gap-3 px-4 py-3 text-sm md:grid-cols-[1fr_80px_100px_100px] md:items-center">
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-950">{item.itemName ?? item.name ?? "Menu item"}</p>
        {itemOptions.optionText ? <p className="mt-1 text-xs text-slate-500">{itemOptions.optionText}</p> : null}
        {itemNote ? (
          <p className="mt-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900">
            Item note: {itemNote}
          </p>
        ) : null}
        {fallbackOptions ? <p className="mt-1 text-xs text-slate-500">{fallbackOptions}</p> : null}
      </div>
      <p className="text-slate-600">Qty {item.quantity ?? 0}</p>
      <p className="text-slate-600">{formatMoney(item.unitPrice)}</p>
      <p className="font-semibold text-slate-950">{formatMoney(item.lineTotal ?? item.totalPrice)}</p>
    </div>
  );
}

function OrderListRow({
  order,
  selected,
  onOpen,
}: {
  order: CheckoutResponse;
  selected: boolean;
  onOpen: () => void;
}) {
  const itemCount = order.items?.reduce((total, item) => total + Number(item.quantity ?? 0), 0) ?? 0;
  const pickupTime = order.requestedPickupTime ? formatDateTime(order.requestedPickupTime) : "Not set";
  const customerName = getCustomerName(order);

  return (
    <button
      className={cn(
        "grid w-full gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50 lg:grid-cols-[1.2fr_130px_110px_130px_150px] lg:items-center",
        selected && "bg-primary/5",
      )}
      onClick={onOpen}
      type="button"
    >
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-950">{customerName}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{order.orderNumber ?? getOrderId(order) ?? "Unknown order"}</p>
        <p className="mt-1 text-xs text-slate-500">{formatDateTime(order.createdAt)}</p>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Status</p>
        <div className="mt-1">
          <StatusBadge status={order.status ?? "PENDING"} />
        </div>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Items</p>
        <p className="mt-1 text-sm font-semibold text-slate-950">{itemCount}</p>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Total</p>
        <p className="mt-1 text-sm font-semibold text-slate-950">{formatMoney(order.finalTotal ?? order.total)}</p>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Pickup</p>
        <p className="mt-1 truncate text-sm text-slate-700">{pickupTime}</p>
      </div>
    </button>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn("rounded-md", statusClasses[status] ?? "border-slate-200 bg-slate-100 text-slate-700")}>
      {formatStatus(status)}
    </Badge>
  );
}

function getAuthHeaders() {
  const token = localStorage.getItem("umika_access_token");
  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function buildOrderNotificationWsUrl(locationId: string) {
  const baseUrl = new URL(
    ORDER_NOTIFICATION_WS_URL ||
      `${ORDER_NOTIFICATION_WS_PREFIX}/manager/order-notifications/ws`,
    window.location.href,
  );
  baseUrl.protocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";

  if (locationId) {
    baseUrl.searchParams.set("locationId", locationId);
  }

  const token = typeof window === "undefined" ? "" : localStorage.getItem("umika_access_token");
  if (token) {
    baseUrl.searchParams.set("token", token);
  }

  return baseUrl.toString();
}

function parseOrderNotification(value: string) {
  try {
    const payload = JSON.parse(value) as OrderNotificationPayload;
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

function playOrderNotificationSound(enabled: boolean) {
  if (!enabled || typeof window === "undefined") {
    return;
  }

  const AudioContextClass =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, context.currentTime);
  oscillator.frequency.setValueAtTime(660, context.currentTime + 0.12);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.22, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.36);
  window.setTimeout(() => void context.close(), 500);
}

function formatNotificationType(payload: OrderNotificationPayload) {
  if (payload.requiresAcceptance) {
    return "Paid order waiting for acceptance";
  }
  if (payload.autoAccepted) {
    return "Paid order sent directly to preparation";
  }
  return `Status ${payload.status ?? "updated"}`;
}

function toPickupTimeValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(11, 16);
  }

  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function adjustPickupTimeValue(value: string, deltaMinutes: number) {
  const [rawHours, rawMinutes] = value ? value.split(":") : [];
  const date = new Date();
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);

  if (Number.isFinite(hours) && Number.isFinite(minutes)) {
    date.setHours(hours, minutes, 0, 0);
  } else {
    date.setSeconds(0, 0);
  }

  date.setMinutes(date.getMinutes() + deltaMinutes);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function fromPickupTimeValue(value: string, existingPickupTime: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  const baseDate = existingPickupTime ? new Date(existingPickupTime) : new Date();
  const date = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;
  const [hours, minutes] = value.split(":").map((part) => Number(part));

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return undefined;
  }

  date.setHours(hours, minutes, 0, 0);
  return toLocalDateTimePayload(date);
}

function toLocalDateTimePayload(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:00`;
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

function normalizeInquiryFilters(filters: OrderInquiryFilters): OrderInquiryFilters {
  const dateMode = filters.dateMode === "range" ? "range" : "exact";

  return {
    email: filters.email.trim(),
    customerName: filters.customerName.trim(),
    phone: filters.phone.trim(),
    notes: filters.notes.trim(),
    dateMode,
    orderDate: dateMode === "exact" ? filters.orderDate.trim() : "",
    orderDateFrom: dateMode === "range" ? filters.orderDateFrom.trim() : "",
    orderDateTo: dateMode === "range" ? filters.orderDateTo.trim() : "",
    locationId: filters.locationId.trim(),
    status: filters.status.trim(),
  };
}

function getLocationId(location: LocationDto) {
  return location.id ?? location.locationId ?? "";
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

  const response = await fetch(url.toString(), {
    headers: getAuthHeaders(),
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    return "";
  }

  const body = (await response.json().catch(() => null)) as { locationId?: string; id?: string } | string | null;
  return typeof body === "string" ? body.trim() : body?.locationId ?? body?.id ?? "";
}

function getOrderId(order: CheckoutResponse | null | undefined) {
  return order?.id ?? order?.orderId ?? "";
}

function getCustomerName(order: CheckoutResponse | null | undefined) {
  const customerName = typeof order?.customerName === "string" ? order.customerName.trim() : "";
  const customerEmail = getCustomerEmail(order);

  return customerName || customerEmail || "Unknown customer";
}

function getCustomerEmail(order: CheckoutResponse | null | undefined) {
  return typeof order?.customerEmail === "string" && order.customerEmail.trim()
    ? order.customerEmail.trim()
    : "No email";
}

function getApiErrorMessage(body: unknown, fallback: string) {
  if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
    return body.message;
  }
  if (body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object") {
    const error = body.error as { message?: unknown };
    if (typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }
  }

  return fallback;
}

function formatMoney(value: unknown) {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(Number.isFinite(number) ? number : 0);
}

function formatPercent(value: unknown) {
  const number = Number(value ?? 0);
  return `${Number.isFinite(number) ? number : 0}%`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function formatRefundReason(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "Requested by customer";
}

function normalizeOrderStatus(value: string | null | undefined): OrderStatus {
  const normalizedValue = (value ?? "").toUpperCase();
  return ORDER_STATUSES.includes(normalizedValue as OrderStatus) ? normalizedValue as OrderStatus : "PENDING";
}

function buildRefundIdempotencyKey(orderId: string) {
  const randomValue = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `refund-${orderId}-${randomValue}`;
}

function getErrorText(error: unknown) {
  return error instanceof Error && error.message.trim() ? error.message : null;
}

function formatOrderType(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "Unknown";
}

function formatOptions(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value);
}

function getOrderItemNote(item: CheckoutOrderItemResponse) {
  const optionSnapshot = getOrderItemOptionSnapshot(item);
  const optionPayload = parseRecordPayload(optionSnapshot);

  return (
    getStringField(item.note) ??
    getStringField(item.itemNote) ??
    getStringField(item.specialInstructions) ??
    getStringField(item.specialInstruction) ??
    getStringField(item.instructions) ??
    getStringField(item.itemNotes) ??
    getStringField(optionPayload?.note) ??
    getStringField(optionPayload?.itemNote) ??
    getStringField(optionPayload?.specialInstructions) ??
    getStringField(optionPayload?.specialInstruction) ??
    getStringField(optionPayload?.instructions) ??
    getStringField(optionPayload?.itemNotes)
  );
}

function getStringField(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getOrderItemOptionSnapshot(item: CheckoutOrderItemResponse) {
  return item.optionSnapshot ?? item.option_snapshot ?? item.optionSnapshotJson ?? item.option_snapshot_json ?? item.options;
}

function parseRecordPayload(value: unknown): Record<string, unknown> | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    if (!value.trim()) {
      return null;
    }

    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
    } catch {
      return null;
    }
  }

  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
