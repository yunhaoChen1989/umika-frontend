"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Bell, CheckCircle2, ClipboardList, Minus, Plus, RefreshCw, Search, Volume2 } from "lucide-react";

import { LoginRedirectLink } from "@/components/auth/login-redirect-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CheckoutOrderItemResponse, CheckoutResponse } from "@/lib/cart-types";
import { cn } from "@/lib/utils";

type OrderStatus = "PENDING" | "PAID" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";

type SpringPage<T> = {
  content?: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
};

const ORDER_STATUSES: OrderStatus[] = ["PENDING", "PAID", "PREPARING", "READY", "COMPLETED", "CANCELLED"];
const ORDER_NOTIFICATION_WS_PREFIX = (process.env.NEXT_PUBLIC_ORDER_NOTIFICATION_WS_PREFIX ?? "/api/v1").replace(/\/$/, "");

const statusClasses: Record<string, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-800",
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-800",
  PREPARING: "border-sky-200 bg-sky-50 text-sky-800",
  READY: "border-primary/20 bg-primary/10 text-primary",
  COMPLETED: "border-slate-200 bg-slate-100 text-slate-700",
  CANCELLED: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function OrderManager() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<CheckoutResponse[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [detailOrderId, setDetailOrderId] = useState("");
  const [emailQuery, setEmailQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [statusDrafts, setStatusDrafts] = useState<Record<string, OrderStatus>>({});
  const [statusNotes, setStatusNotes] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "unauthenticated" | "error">("idle");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [pickupUpdatingId, setPickupUpdatingId] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [activeAlertOrderId, setActiveAlertOrderId] = useState<string | null>(null);
  const [latestNotification, setLatestNotification] = useState<OrderNotificationPayload | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeAlertOrderIdRef = useRef<string | null>(null);

  const selectedOrder = useMemo(
    () => orders.find((order) => getOrderId(order) === selectedOrderId) ?? orders[0] ?? null,
    [orders, selectedOrderId],
  );
  const detailOrder = useMemo(
    () => orders.find((order) => getOrderId(order) === detailOrderId) ?? null,
    [orders, detailOrderId],
  );
  const locationContext = useMemo(() => getStoredLocationContext(searchParams), [searchParams]);
  const locationKey = `${locationContext.locationId ?? ""}:${locationContext.locationCode ?? ""}`;

  useEffect(() => {
    setOrders([]);
    setSelectedOrderId("");
    setDetailOrderId("");
    setStatus("idle");
    setMessage(null);
    setError(null);
    setDialogError(null);
  }, [locationKey]);

  useEffect(() => {
    activeAlertOrderIdRef.current = activeAlertOrderId;
  }, [activeAlertOrderId]);

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

  async function searchOrders(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    const email = emailQuery.trim();

    if (!email) {
      setError("Enter a customer email to search orders.");
      return;
    }

    setStatus("loading");
    setMessage(null);
    setError(null);

    const locationId = await resolveLocationId(locationContext);

    if (!locationId && locationContext.locationCode) {
      setStatus("error");
      setError("Unable to resolve the selected header location. Please choose the location again.");
      return;
    }

    const url = new URL("/api/orders", window.location.origin);
    url.searchParams.set("email", email);
    url.searchParams.set("page", "0");
    url.searchParams.set("size", "50");
    url.searchParams.set("sort", "createdAt,desc");

    if (locationId) {
      url.searchParams.set("locationId", locationId);
    }

    if (statusFilter) {
      url.searchParams.set("status", statusFilter);
    }

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

    setOrders(loadedOrders);
    setSelectedOrderId(getOrderId(loadedOrders[0]) ?? "");
    setDetailOrderId("");
    setStatusDrafts(
      Object.fromEntries(
        loadedOrders
          .map((order) => [getOrderId(order), (order.status ?? "PENDING") as OrderStatus])
          .filter((entry): entry is [string, OrderStatus] => Boolean(entry[0])),
      ),
    );
    setStatus(loadedOrders.length > 0 ? "ready" : "idle");
    setMessage(loadedOrders.length === 0 ? "No orders found for that email." : null);
  }

  async function updateOrderStatus(order: CheckoutResponse) {
    const orderId = getOrderId(order);

    if (!orderId) {
      return;
    }

    const nextStatus = statusDrafts[orderId] ?? order.status ?? "PENDING";
    const note = statusNotes[orderId]?.trim() || defaultStatusNote(nextStatus);

    setUpdatingId(orderId);
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/status`, {
      method: "PATCH",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: nextStatus,
        note,
      }),
      cache: "no-store",
    }).catch(() => null);

    setUpdatingId(null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setError(getApiErrorMessage(body, "Unable to update order status."));
      return;
    }

    const updatedOrder = (await response.json().catch(() => null)) as CheckoutResponse | null;
    setOrders((current) =>
      current.map((item) => (getOrderId(item) === orderId ? updatedOrder && getOrderId(updatedOrder) ? updatedOrder : { ...item, status: nextStatus } : item)),
    );
    setMessage(`Order ${order.orderNumber ?? orderId} status updated to ${nextStatus}.`);
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
  }

  async function updatePickupTime(order: CheckoutResponse, requestedPickupTime?: string) {
    const orderId = getOrderId(order);

    if (!orderId || !requestedPickupTime) {
      return;
    }

    setPickupUpdatingId(orderId);
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
        status: order.status ?? "PREPARING",
        note: "Pickup time updated by staff",
        requestedPickupTime,
      }),
      cache: "no-store",
    }).catch(() => null);

    setPickupUpdatingId(null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      const message = getApiErrorMessage(body, "Unable to update pickup time.");
      setError(message);
      setDialogError(message);
      return;
    }

    const updatedOrder = (await response.json().catch(() => null)) as CheckoutResponse | null;
    if (updatedOrder && getOrderId(updatedOrder)) {
      upsertOrder(updatedOrder);
    }
    setMessage(`Order ${order.orderNumber ?? orderId} pickup time updated.`);
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
    setStatusDrafts((current) => ({
      ...current,
      [orderId]: (order.status ?? "PENDING") as OrderStatus,
    }));
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
          <CardTitle className="text-base">Search orders</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 lg:grid-cols-[1fr_220px_auto]" onSubmit={(event) => void searchOrders(event)}>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Customer email</span>
              <input
                className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                onChange={(event) => setEmailQuery(event.target.value)}
                placeholder="customer@example.com"
                type="email"
                value={emailQuery}
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Status</span>
              <select
                className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                onChange={(event) => setStatusFilter(event.target.value)}
                value={statusFilter}
              >
                <option value="">All statuses</option>
                {ORDER_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {formatStatus(item)}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-2">
              <Button className="w-full lg:w-auto" disabled={status === "loading"} type="submit">
                <Search className="h-4 w-4" />
                {status === "loading" ? "Searching..." : "Search"}
              </Button>
              <Button className="w-full lg:w-auto" disabled={!emailQuery.trim() || status === "loading"} onClick={() => void searchOrders()} type="button" variant="outline">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 2xl:grid-cols-[460px_1fr]">
        <Card className="overflow-hidden rounded-md shadow-none">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4 text-primary" />
              Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {orders.length === 0 ? (
              <div className="p-5 text-sm text-slate-500">Live paid orders appear here. You can also search by customer email.</div>
            ) : (
              <div className="max-h-[720px] overflow-y-auto">
                {orders.map((order) => {
                  const orderId = getOrderId(order) ?? "";
                  const isSelected = getOrderId(selectedOrder) === orderId;

                  return (
                    <button
                      className={cn(
                        "block w-full border-b border-slate-200 px-5 py-4 text-left transition-colors hover:bg-slate-50",
                        isSelected && "bg-primary/5",
                      )}
                      key={orderId || order.orderNumber || Math.random()}
                      onClick={() => {
                        setSelectedOrderId(orderId);
                        setDetailOrderId(orderId);
                      }}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-950">{order.orderNumber ?? orderId}</p>
                          <p className="mt-1 text-xs text-slate-500">{formatDateTime(order.createdAt)}</p>
                        </div>
                        <StatusBadge status={order.status ?? "PENDING"} />
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500">
                        <span>{formatOrderType(order.orderType)}</span>
                        <span>{order.items?.length ?? 0} items</span>
                        <span className="text-right font-semibold text-slate-900">{formatMoney(order.finalTotal ?? order.total)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-md shadow-none">
          <CardHeader className="border-b border-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Order detail</CardTitle>
                <p className="mt-2 text-sm text-slate-500">
                  Backend totals, item snapshots, taxes, discounts, and status are displayed as returned.
                </p>
              </div>
              {selectedOrder ? <StatusBadge status={selectedOrder.status ?? "PENDING"} /> : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {!selectedOrder ? (
              <div className="rounded-md border border-slate-200 p-5 text-sm text-slate-500">Select an order to inspect.</div>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <SummaryTile label="Order number" value={selectedOrder.orderNumber ?? getOrderId(selectedOrder) ?? "Unknown"} />
                  <SummaryTile label="Type" value={formatOrderType(selectedOrder.orderType)} />
                  <SummaryTile label="Subtotal" value={formatMoney(selectedOrder.subtotal)} />
                  <SummaryTile label="Final total" value={formatMoney(selectedOrder.finalTotal ?? selectedOrder.total)} />
                </div>
                <Button type="button" variant="outline" onClick={() => setDetailOrderId(getOrderId(selectedOrder))}>
                  View details
                </Button>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <SummaryTile label="Discount" value={formatMoney(selectedOrder.totalDiscount)} />
                  <SummaryTile label="Reward discount" value={formatMoney(selectedOrder.rewardDiscountAmount)} />
                  <SummaryTile label="Tax" value={`${formatMoney(selectedOrder.taxAmount ?? selectedOrder.tax)} / ${formatPercent(selectedOrder.taxRate)}`} />
                  <SummaryTile label="Points" value={`${selectedOrder.pointsRedeemed ?? 0} redeemed / ${selectedOrder.pointsEarned ?? 0} earned`} />
                </div>

                <div className="rounded-md border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-950">Status update</p>
                  <div className="mt-3 grid gap-3 lg:grid-cols-[220px_1fr_auto]">
                    <select
                      className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      onChange={(event) =>
                        setStatusDrafts((current) => ({
                          ...current,
                          [getOrderId(selectedOrder) ?? ""]: event.target.value as OrderStatus,
                        }))
                      }
                      value={statusDrafts[getOrderId(selectedOrder) ?? ""] ?? selectedOrder.status ?? "PENDING"}
                    >
                      {ORDER_STATUSES.map((item) => (
                        <option key={item} value={item}>
                          {formatStatus(item)}
                        </option>
                      ))}
                    </select>
                    <input
                      className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      onChange={(event) =>
                        setStatusNotes((current) => ({
                          ...current,
                          [getOrderId(selectedOrder) ?? ""]: event.target.value,
                        }))
                      }
                      placeholder="Optional status note"
                      value={statusNotes[getOrderId(selectedOrder) ?? ""] ?? ""}
                    />
                    <Button disabled={updatingId === getOrderId(selectedOrder)} onClick={() => void updateOrderStatus(selectedOrder)} type="button">
                      {updatingId === getOrderId(selectedOrder) ? "Updating..." : "Update status"}
                    </Button>
                  </div>
                </div>

                <div className="rounded-md border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-100 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Items</div>
                  <div className="divide-y divide-slate-200">
                    {(selectedOrder.items ?? []).map((item, index) => (
                      <OrderItemRow item={item} key={item.id ?? `${item.menuItemId}-${index}`} />
                    ))}
                    {(selectedOrder.items ?? []).length === 0 ? <div className="p-4 text-sm text-slate-500">No item snapshots returned.</div> : null}
                  </div>
                </div>

                {selectedOrder.customerNote ? (
                  <div className="rounded-md border border-slate-200 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Customer note</p>
                    <p className="mt-2 text-sm text-slate-700">{selectedOrder.customerNote}</p>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <ManagerOrderDetailsDialog
        acceptingId={acceptingId}
        error={dialogError}
        order={detailOrder}
        onAccept={(order, requestedPickupTime) => void acceptOrder(order, requestedPickupTime)}
        onPickupTimeUpdate={(order, requestedPickupTime) => void updatePickupTime(order, requestedPickupTime)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailOrderId("");
            setDialogError(null);
          }
        }}
        pickupUpdatingId={pickupUpdatingId}
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
  onAccept,
  onPickupTimeUpdate,
  onOpenChange,
  pickupUpdatingId,
}: {
  acceptingId: string | null;
  error: string | null;
  order: CheckoutResponse | null;
  onAccept: (order: CheckoutResponse, requestedPickupTime?: string) => void;
  onPickupTimeUpdate: (order: CheckoutResponse, requestedPickupTime?: string) => void;
  onOpenChange: (open: boolean) => void;
  pickupUpdatingId: string | null;
}) {
  const items = order?.items ?? [];
  const orderId = order ? getOrderId(order) : "";
  const [pickupTime, setPickupTime] = useState("");
  const isWaitingForAcceptance = (order?.status ?? "").toUpperCase() === "PAID";

  useEffect(() => {
    setPickupTime(toPickupTimeValue(order?.requestedPickupTime));
  }, [order?.requestedPickupTime, orderId]);

  return (
    <Dialog open={Boolean(order)} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,56rem)]">
        {order ? (
          <>
            <DialogHeader>
              <DialogTitle>{order.orderNumber ?? orderId}</DialogTitle>
              <DialogDescription>
                {formatDateTime(order.createdAt)} · {formatOrderType(order.orderType)}
              </DialogDescription>
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

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <SummaryTile label="Order number" value={order.orderNumber ?? orderId ?? "Unknown"} />
                <SummaryTile label="Type" value={formatOrderType(order.orderType)} />
                <SummaryTile label="Subtotal" value={formatMoney(order.subtotal)} />
                <SummaryTile label="Final total" value={formatMoney(order.finalTotal ?? order.total)} />
                <SummaryTile label="Discount" value={formatMoney(order.totalDiscount)} />
                <SummaryTile label="Reward discount" value={formatMoney(order.rewardDiscountAmount)} />
                <SummaryTile label="Tax" value={`${formatMoney(order.taxAmount ?? order.tax)} / ${formatPercent(order.taxRate)}`} />
                <SummaryTile label="Points" value={`${order.pointsRedeemed ?? 0} redeemed / ${order.pointsEarned ?? 0} earned`} />
              </div>

              {order.orderType === "PICKUP" ? (
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
                    {isWaitingForAcceptance ? (
                      <Button disabled={acceptingId === orderId} onClick={() => onAccept(order, fromPickupTimeValue(pickupTime, order.requestedPickupTime))} type="button">
                        {acceptingId === orderId ? "Accepting..." : "Accept order"}
                      </Button>
                    ) : (
                      <Button disabled={pickupUpdatingId === orderId} onClick={() => onPickupTimeUpdate(order, fromPickupTimeValue(pickupTime, order.requestedPickupTime))} type="button" variant="outline">
                        {pickupUpdatingId === orderId ? "Saving..." : "Save pickup time"}
                      </Button>
                    )}
                  </div>
                  {isWaitingForAcceptance ? (
                    <p className="mt-2 text-xs text-slate-500">Adjust the pickup time if needed, then accept to confirm it for the customer.</p>
                  ) : null}
                </div>
              ) : isWaitingForAcceptance ? (
                <div className="rounded-md border border-slate-200 p-4">
                  <Button disabled={acceptingId === orderId} onClick={() => onAccept(order)} type="button">
                    {acceptingId === orderId ? "Accepting..." : "Accept order"}
                  </Button>
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
                <div className="rounded-md border border-slate-200 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Customer note</p>
                  <p className="mt-2 text-sm text-slate-700">{order.customerNote}</p>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function OrderItemRow({ item }: { item: CheckoutOrderItemResponse }) {
  return (
    <div className="grid gap-3 px-4 py-3 text-sm md:grid-cols-[1fr_80px_100px_100px] md:items-center">
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-950">{item.itemName ?? item.name ?? "Menu item"}</p>
        {item.options ? <p className="mt-1 truncate text-xs text-slate-500">{formatOptions(item.options)}</p> : null}
      </div>
      <p className="text-slate-600">Qty {item.quantity ?? 0}</p>
      <p className="text-slate-600">{formatMoney(item.unitPrice)}</p>
      <p className="font-semibold text-slate-950">{formatMoney(item.lineTotal ?? item.totalPrice)}</p>
    </div>
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
  const baseUrl = new URL(window.location.href);
  baseUrl.protocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";
  baseUrl.pathname = `${ORDER_NOTIFICATION_WS_PREFIX}/manager/order-notifications/ws`;
  baseUrl.search = "";

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

function defaultStatusNote(status: string) {
  return status === "PAID" ? "Payment confirmed" : `Status updated to ${status}`;
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

function formatOrderType(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "Unknown";
}

function formatOptions(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value);
}
