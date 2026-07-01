"use client";

import { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CheckoutResponse } from "@/lib/cart-types";

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
  tipAmount: string;
  loginRequired: string;
};

export function OrderHistoryPanel({ copy }: { copy: OrderHistoryCopy }) {
  const [orders, setOrders] = useState<CheckoutResponse[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "unauthenticated" | "error">("loading");

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      const token = localStorage.getItem("umika_access_token");

      if (!token) {
        setStatus("unauthenticated");
        return;
      }

      const url = new URL("/api/orders", window.location.origin);
      url.searchParams.set("page", "0");
      url.searchParams.set("size", "10");
      url.searchParams.append("sort", "createdAt,desc");

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
  }, []);

  return (
    <section className="mt-8">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-semibold">{copy.orderHistoryTitle}</h2>
      </div>
      {status === "loading" ? <p className="mt-4 text-sm text-muted-foreground">{copy.orderHistoryLoading}</p> : null}
      {status === "unauthenticated" ? <p className="mt-4 text-sm text-muted-foreground">{copy.loginRequired}</p> : null}
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
                  {order.status ? <Badge>{order.status}</Badge> : null}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <Info label={copy.orderTotal} value={formatMoney(order.finalTotal ?? order.total)} />
                  <Info label={copy.orderStatus} value={order.status ?? "--"} />
                  {typeof order.tipAmount === "number" ? <Info label={copy.tipAmount} value={formatMoney(order.tipAmount)} /> : null}
                  {order.customerNote ? <Info label={copy.orderNote} value={order.customerNote} /> : null}
                </div>
                {order.items?.length ? (
                  <div className="mt-4 border-t pt-3">
                    <p className="text-sm font-semibold">{copy.orderItems}</p>
                    <div className="mt-2 space-y-2 text-sm">
                      {order.items.map((item, index) => (
                        <div className="flex justify-between gap-3" key={item.id ?? `${item.itemName}-${index}`}>
                          <span className="min-w-0 truncate">
                            {item.itemName ?? item.name ?? item.menuItemId} x {item.quantity ?? 1}
                          </span>
                          <span>{formatMoney(item.totalPrice ?? item.lineTotal)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function formatMoney(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `$${value.toFixed(2)}` : "--";
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
