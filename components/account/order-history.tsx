"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClipboardList } from "lucide-react";

import { LoginRedirectLink } from "@/components/auth/login-redirect-link";
import { StripePaymentSection } from "@/components/order/stripe-payment-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCartOptions } from "@/lib/cart-options";
import type { CheckoutOrderItemResponse, CheckoutResponse } from "@/lib/cart-types";
import type { Dictionary } from "@/lib/i18n";

type SpringPage<T> = {
  content?: T[];
};

type OrderHistoryCopy = {
  orderHistoryTitle: string;
  orderHistoryLoading: string;
  orderHistoryEmpty: string;
  orderHistoryError: string;
  orderNumber: string;
  orderStatus: string;
  orderDate: string;
  orderItems: string;
  orderTotal: string;
  orderNote: string;
  orderDetails: string;
  orderType: string;
  requestedPickupTime: string;
  subtotal: string;
  discount: string;
  rewardDiscount: string;
  taxRate: string;
  tax: string;
  pointsRedeemed: string;
  pointsEarned: string;
  quantity: string;
  noItemDetails: string;
  tipAmount: string;
  itemFallback: string;
  loginRequired: string;
  login: string;
};

export function OrderHistoryPanel({ copy, paymentCopy }: { copy: OrderHistoryCopy; paymentCopy: Dictionary }) {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<CheckoutResponse[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "unauthenticated" | "error">("loading");
  const [selectedOrder, setSelectedOrder] = useState<CheckoutResponse | null>(null);

  useEffect(() => {
    let active = true;
    const locationId =
      searchParams.get("locationId")?.trim() ??
      searchParams.get("location")?.trim() ??
      searchParams.get("storeId")?.trim() ??
      searchParams.get("store")?.trim();
    const locationCode = searchParams.get("locationCode")?.trim() ?? searchParams.get("storeCode")?.trim();

    async function loadOrders() {
      const token = localStorage.getItem("umika_access_token");

      if (!token) {
        setStatus("unauthenticated");
        return;
      }

      setStatus("loading");
      setSelectedOrder(null);

      const currentLocationId = await resolveStoredLocationId(locationId, locationCode);

      if (!active) {
        return;
      }

      const url = new URL("/api/orders", window.location.origin);
      url.searchParams.set("page", "0");
      url.searchParams.set("size", "10");
      url.searchParams.append("sort", "createdAt,desc");

      if (currentLocationId) {
        url.searchParams.set("locationId", currentLocationId);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }).catch(() => null);

      if (!active) {
        return;
      }

      if (!response?.ok) {
        setStatus(response?.status === 401 || response?.status === 403 ? "unauthenticated" : "error");
        return;
      }

      const body = (await response.json().catch(() => null)) as SpringPage<CheckoutResponse> | CheckoutResponse[] | null;
      setOrders(Array.isArray(body) ? body : body?.content ?? []);
      setStatus("ready");
    }

    void loadOrders();

    return () => {
      active = false;
    };
  }, [searchParams]);

  return (
    <section className="mt-8">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-semibold">{copy.orderHistoryTitle}</h2>
      </div>
      {status === "loading" ? <p className="mt-4 text-sm text-muted-foreground">{copy.orderHistoryLoading}</p> : null}
      {status === "unauthenticated" ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {copy.loginRequired}{" "}
          <LoginRedirectLink className="font-semibold text-primary underline underline-offset-4">{copy.login}</LoginRedirectLink>
        </p>
      ) : null}
      {status === "error" ? <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{copy.orderHistoryError}</p> : null}
      {status === "ready" && orders.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">{copy.orderHistoryEmpty}</p> : null}
      {orders.length ? (
        <div className="mt-4 grid gap-4">
          {orders.map((order) => (
            <Card key={order.id ?? order.orderId ?? order.orderNumber}>
              <CardHeader>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <CardTitle className="text-base">{order.orderNumber ?? order.id ?? order.orderId}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {copy.orderDate}: {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {order.status ? <Badge>{order.status}</Badge> : null}
                    <Button type="button" variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
                      {copy.orderDetails}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <button
                  type="button"
                  className="grid w-full gap-3 rounded-md text-left text-sm outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-2"
                  onClick={() => setSelectedOrder(order)}
                >
                  <Info label={copy.orderTotal} value={formatMoney(order.finalTotal ?? order.total)} />
                  <Info label={copy.orderStatus} value={order.status ?? "--"} />
                  {typeof order.tipAmount === "number" ? <Info label={copy.tipAmount} value={formatMoney(order.tipAmount)} /> : null}
                  {order.customerNote ? <Info label={copy.orderNote} value={order.customerNote} /> : null}
                </button>
                {order.items?.length ? (
                  <div className="mt-4 border-t pt-3">
                    <p className="text-sm font-semibold">{copy.orderItems}</p>
                    <div className="mt-2 space-y-2 text-sm">
                      {order.items.map((item, index) => {
                        const itemOptions = formatCartOptions(getOrderItemOptionSnapshot(item));

                        return (
                          <div className="flex justify-between gap-3" key={item.id ?? `${item.itemName}-${index}`}>
                            <span className="min-w-0">
                              <span className="block truncate">{item.itemName ?? item.name ?? item.menuItemId} x {item.quantity ?? 1}</span>
                              {itemOptions.optionText ? <span className="mt-1 block truncate text-xs text-muted-foreground">{itemOptions.optionText}</span> : null}
                              {itemOptions.note ? <span className="mt-1 block truncate text-xs text-muted-foreground">{copy.orderNote}: {itemOptions.note}</span> : null}
                            </span>
                            <span>{formatMoney(item.totalPrice ?? item.lineTotal)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                {isPayableOrder(order) ? (
                  <StripePaymentSection
                    order={order}
                    copy={paymentCopy}
                    onPaid={(paidOrder) => {
                      setOrders((currentOrders) =>
                        currentOrders.map((currentOrder) =>
                          (currentOrder.id ?? currentOrder.orderId) === (order.id ?? order.orderId)
                            ? { ...currentOrder, ...paidOrder, status: paidOrder?.status ?? "PAID" }
                            : currentOrder,
                        ),
                      );
                    }}
                  />
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
      <OrderDetailsDialog
        copy={copy}
        order={selectedOrder}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOrder(null);
          }
        }}
      />
    </section>
  );
}

function isPayableOrder(order: CheckoutResponse) {
  return (order.status ?? "").toUpperCase() === "PENDING";
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 py-1">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function OrderDetailsDialog({
  copy,
  order,
  onOpenChange,
}: {
  copy: OrderHistoryCopy;
  order: CheckoutResponse | null;
  onOpenChange: (open: boolean) => void;
}) {
  const items = order?.items ?? [];
  const orderTitle = order?.orderNumber ?? order?.id ?? order?.orderId ?? copy.orderDetails;

  return (
    <Dialog open={Boolean(order)} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,48rem)]">
        {order ? (
          <>
            <DialogHeader>
              <DialogTitle>{orderTitle}</DialogTitle>
              <DialogDescription>
                {copy.orderDate}: {formatDate(order.createdAt)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 p-5">
              <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <DetailTile label={copy.orderStatus} value={order.status ?? "--"} />
                <DetailTile label={copy.orderType} value={order.orderType ?? "--"} />
                {order.requestedPickupTime ? <DetailTile label={copy.requestedPickupTime} value={formatDate(order.requestedPickupTime)} /> : null}
                <DetailTile label={copy.orderTotal} value={formatMoney(order.finalTotal ?? order.total)} />
                <DetailTile label={copy.subtotal} value={formatMoney(order.subtotal)} />
                <DetailTile label={copy.discount} value={formatMoney(order.totalDiscount)} />
                <DetailTile label={copy.rewardDiscount} value={formatMoney(order.rewardDiscountAmount)} />
                <DetailTile label={copy.taxRate} value={formatPercent(order.taxRate)} />
                <DetailTile label={copy.tax} value={formatMoney(order.taxAmount ?? order.tax)} />
                {typeof order.tipAmount === "number" ? <DetailTile label={copy.tipAmount} value={formatMoney(order.tipAmount)} /> : null}
                <DetailTile label={copy.pointsRedeemed} value={formatNumber(order.pointsRedeemed)} />
                <DetailTile label={copy.pointsEarned} value={formatNumber(order.pointsEarned)} />
              </div>

              <div className="rounded-md border border-border">
                <div className="border-b border-border bg-muted/50 px-4 py-3 text-sm font-semibold">{copy.orderItems}</div>
                {items.length ? (
                  <div className="divide-y divide-border">
                    {items.map((item, index) => {
                      const optionSnapshot = getOrderItemOptionSnapshot(item);
                      const itemOptions = formatCartOptions(optionSnapshot);
                      const fallbackOptions = itemOptions.optionText || itemOptions.note ? "" : formatOptions(optionSnapshot);

                      return (
                        <div className="grid gap-3 px-4 py-3 text-sm sm:grid-cols-[1fr_auto_auto_auto] sm:items-center" key={item.id ?? `${item.itemName ?? item.name}-${index}`}>
                          <div className="min-w-0">
                            <p className="font-semibold">{item.itemName ?? item.name ?? item.menuItemId ?? `${copy.itemFallback} ${index + 1}`}</p>
                            {itemOptions.optionText ? <p className="mt-1 text-xs text-muted-foreground">{itemOptions.optionText}</p> : null}
                            {itemOptions.note ? <p className="mt-1 text-xs text-muted-foreground">{copy.orderNote}: {itemOptions.note}</p> : null}
                            {fallbackOptions ? <p className="mt-1 text-xs text-muted-foreground">{fallbackOptions}</p> : null}
                          </div>
                          <p className="text-muted-foreground">
                            {copy.quantity} {item.quantity ?? 1}
                          </p>
                          <p className="text-muted-foreground">{formatMoney(item.unitPrice)}</p>
                          <p className="font-semibold">{formatMoney(item.totalPrice ?? item.lineTotal)}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-4 py-3 text-sm text-muted-foreground">{copy.noItemDetails}</div>
                )}
              </div>

              {order.customerNote ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
                  <p className="font-semibold text-amber-900">{copy.orderNote}</p>
                  <p className="mt-1 text-amber-950">{order.customerNote}</p>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function formatMoney(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `$${value.toFixed(2)}` : "--";
}

function formatNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "--";
}

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(2)}%` : "--";
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatOptions(value: unknown) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value);
}

function getOrderItemOptionSnapshot(item: CheckoutOrderItemResponse) {
  return item.optionSnapshot ?? item.option_snapshot ?? item.optionSnapshotJson ?? item.option_snapshot_json ?? item.options;
}

async function resolveStoredLocationId(queryLocationId: string | null | undefined, queryLocationCode: string | null | undefined) {
  const storedLocationId =
    queryLocationId ??
    sessionStorage.getItem("umika_location_id")?.trim() ??
    localStorage.getItem("umika_location_id")?.trim() ??
    sessionStorage.getItem("location_id")?.trim() ??
    localStorage.getItem("location_id")?.trim();

  if (storedLocationId) {
    return storedLocationId;
  }

  const storedLocationCode =
    queryLocationCode ??
    sessionStorage.getItem("umika_location_code")?.trim() ??
    localStorage.getItem("umika_location_code")?.trim();

  if (!storedLocationCode) {
    return "";
  }

  const url = new URL("/api/locations/resolve-id", window.location.origin);
  url.searchParams.set("locationCode", storedLocationCode);

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    return "";
  }

  const body = await response.json().catch(() => null) as { id?: string | null; locationId?: string | null; location_id?: string | null } | string | null;
  const locationId = typeof body === "string" ? body.trim() : body?.locationId ?? body?.location_id ?? body?.id ?? "";

  if (locationId) {
    sessionStorage.setItem("umika_location_id", locationId);
    localStorage.setItem("umika_location_id", locationId);
    sessionStorage.setItem("location_id", locationId);
    localStorage.setItem("location_id", locationId);
  }

  return locationId;
}
