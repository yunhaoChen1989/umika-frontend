"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CreditCard, RefreshCw, X } from "lucide-react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";

import { Button } from "@/components/ui/button";
import { getAuthHeaders, normalizePayload } from "@/lib/cart-client";
import type { CheckoutResponse, StripePaymentIntentResponse } from "@/lib/cart-types";
import type { Dictionary } from "@/lib/i18n";

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

type ConfirmBackendPaymentResult =
  | {
      ok: true;
      order?: CheckoutResponse | null;
    }
  | {
      ok: false;
      message?: string;
    };

export function StripePaymentSection({
  order,
  copy,
  onPaid,
  onClose,
}: {
  order: CheckoutResponse;
  copy: Dictionary;
  onPaid?: (paidOrder?: CheckoutResponse) => void;
  onClose?: () => void;
}) {
  const orderId = order.id ?? order.orderId;
  const [paymentIntent, setPaymentIntent] = useState<StripePaymentIntentResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "paid" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [dynamicStripePromise, setDynamicStripePromise] = useState<Promise<Stripe | null> | null>(stripePromise);
  const isCreatingIntentRef = useRef(false);
  const onPaidRef = useRef(onPaid);
  const orderRef = useRef(order);
  const statusRef = useRef(status);

  useEffect(() => {
    onPaidRef.current = onPaid;
  }, [onPaid]);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const completePaidState = useCallback(async (confirmed?: ConfirmBackendPaymentResult) => {
    setStatus("paid");
    setError(null);

    const paidOrder = confirmed?.ok ? confirmed.order ?? await fetchPaidOrderSnapshot(orderRef.current) : null;
    onPaidRef.current?.(paidOrder ?? { ...orderRef.current, status: "PAID" });
  }, []);

  const createPaymentIntent = useCallback(async () => {
    if (isCreatingIntentRef.current || statusRef.current === "paid" || isPaidOrderStatus(order.status)) {
      if (isPaidOrderStatus(order.status)) {
        setStatus("paid");
        setError(null);
      }
      return;
    }

    if (!orderId) {
      setStatus("error");
      setError(copy.orderPage.paymentIntentError);
      return;
    }

    isCreatingIntentRef.current = true;
    setStatus("loading");
    setError(null);

    try {
      const headers = getAuthHeaders();
      headers.set("Content-Type", "application/json");
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 12000);

      const response = await fetch("/api/payments/stripe/payment-intent", {
        method: "POST",
        headers,
        body: JSON.stringify({ orderId }),
        cache: "no-store",
        signal: controller.signal,
      }).catch(() => null);
      window.clearTimeout(timeout);

      if (!response?.ok) {
        const body = response ? await response.json().catch(() => null) : null;
        setStatus("error");
        setError(resolveErrorMessage(body, copy.orderPage.paymentIntentError));
        return;
      }

      const intent = normalizePayload<StripePaymentIntentResponse>(await response.json().catch(() => null));
      const clientSecret = firstString(intent?.clientSecret, intent?.client_secret);
      const publishableKey = firstString(intent?.publishableKey, intent?.publishable_key);

      if (publishableKey && !stripePublishableKey) {
        setDynamicStripePromise(loadStripe(publishableKey));
      }

      setPaymentIntent(intent);
      if (isSucceededStatus(intent?.status)) {
        const confirmed = await confirmBackendPayment(orderId, firstString(intent?.paymentIntentId, intent?.payment_intent_id, intent?.id), copy.orderPage.paymentConfirmError);

        if (!confirmed.ok) {
          setStatus("error");
          setError(confirmed.message ?? copy.orderPage.paymentConfirmError);
          return;
        }

        await completePaidState(confirmed);
        return;
      }

      if (!clientSecret) {
        setStatus("error");
        setError(copy.orderPage.paymentIntentError);
        return;
      }

      setStatus("ready");
    } finally {
      isCreatingIntentRef.current = false;
    }
  }, [completePaidState, copy.orderPage.paymentConfirmError, copy.orderPage.paymentIntentError, order.status, orderId]);

  useEffect(() => {
    if (isPaidOrderStatus(order.status)) {
      setStatus("paid");
      setError(null);
      return;
    }

    void createPaymentIntent();
  }, [createPaymentIntent, order.status]);

  const clientSecret = firstString(paymentIntent?.clientSecret, paymentIntent?.client_secret);

  if (status === "loading" || status === "idle") {
    return <p className="mt-5 text-sm text-muted-foreground">{copy.orderPage.paymentLoading}</p>;
  }

  if (status === "paid") {
    return (
      <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
        <div className="flex items-start justify-between gap-3">
          <p>{copy.orderPage.paymentSuccess}</p>
          {onClose ? (
            <Button className="h-8 w-8 shrink-0 text-emerald-900" onClick={onClose} size="icon" type="button" variant="ghost" aria-label={copy.common.close}>
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
        {onClose ? (
          <Button className="mt-3" onClick={onClose} type="button" variant="outline">
            {copy.common.close}
          </Button>
        ) : null}
      </div>
    );
  }

  if (status === "error" || !clientSecret || !dynamicStripePromise) {
    return (
      <div className="mt-5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">
        <p>{error ?? (!dynamicStripePromise ? copy.orderPage.stripeConfigMissing : copy.orderPage.paymentIntentError)}</p>
        <Button className="mt-3" onClick={() => void createPaymentIntent()} type="button" variant="outline">
          <RefreshCw className="h-4 w-4" />
          {copy.orderPage.paymentRetry}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-md border bg-background p-3">
      <p className="text-sm font-semibold">{copy.orderPage.paymentTitle}</p>
      <Elements stripe={dynamicStripePromise} options={{ clientSecret }}>
        <StripeCheckoutForm
          copy={copy}
          orderId={orderId ?? ""}
          clientSecret={clientSecret}
          paymentIntentId={firstString(paymentIntent?.paymentIntentId, paymentIntent?.payment_intent_id, paymentIntent?.id)}
          onPaid={(paidOrder) => {
            setStatus("paid");
            onPaidRef.current?.(paidOrder ?? { ...orderRef.current, status: "PAID" });
          }}
          onError={setError}
          onRetryIntent={createPaymentIntent}
        />
      </Elements>
      {error ? (
        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function StripeCheckoutForm({
  copy,
  orderId,
  clientSecret,
  paymentIntentId,
  onPaid,
  onError,
  onRetryIntent,
}: {
  copy: Dictionary;
  orderId: string;
  clientSecret: string;
  paymentIntentId?: string;
  onPaid: (paidOrder?: CheckoutResponse) => void;
  onError: (message: string | null) => void;
  onRetryIntent: () => Promise<void>;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isPaying, setIsPaying] = useState(false);
  const isPayingRef = useRef(false);

  async function pay() {
    if (isPayingRef.current) {
      return;
    }

    if (!stripe || !elements) {
      return;
    }

    isPayingRef.current = true;
    setIsPaying(true);
    onError(null);

    const currentIntent = await stripe.retrievePaymentIntent(clientSecret);
    if (currentIntent.paymentIntent?.status === "succeeded") {
      const confirmed = await confirmBackendPayment(orderId, currentIntent.paymentIntent.id ?? paymentIntentId, copy.orderPage.paymentConfirmError);
      isPayingRef.current = false;
      setIsPaying(false);

      if (confirmed.ok) {
        onPaid(confirmed.order ?? undefined);
        return;
      }

      onError(confirmed.message ?? copy.orderPage.paymentConfirmError);
      return;
    }

    if (currentIntent.error) {
      isPayingRef.current = false;
      setIsPaying(false);
      onError(currentIntent.error.message ?? copy.orderPage.paymentError);
      return;
    }

    const result = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (result.error) {
      const succeededPaymentIntentId = getSucceededPaymentIntentId(result.error);

      if (succeededPaymentIntentId || result.error.code === "payment_intent_unexpected_state") {
        const confirmed = await confirmBackendPayment(orderId, succeededPaymentIntentId ?? paymentIntentId, copy.orderPage.paymentConfirmError);
        isPayingRef.current = false;
        setIsPaying(false);

        if (confirmed.ok) {
          onPaid(confirmed.order ?? undefined);
          return;
        }

        onError(confirmed.message ?? copy.orderPage.paymentConfirmError);
        return;
      }

      isPayingRef.current = false;
      setIsPaying(false);
      onError(result.error.message ?? copy.orderPage.paymentError);
      return;
    }

    const stripePaymentIntentId = result.paymentIntent?.id ?? paymentIntentId;
    const confirmed = await confirmBackendPayment(orderId, stripePaymentIntentId, copy.orderPage.paymentConfirmError);

    isPayingRef.current = false;
    setIsPaying(false);

    if (!confirmed.ok) {
      onError(confirmed.message ?? copy.orderPage.paymentConfirmError);
      return;
    }

    onPaid(confirmed.order ?? undefined);
  }

  return (
    <div className="mt-4 space-y-4">
      <PaymentElement />
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Button className="w-full" disabled={!stripe || !elements || isPaying} onClick={() => void pay()} type="button">
          <CreditCard className="h-4 w-4" />
          {isPaying ? copy.orderPage.paymentProcessing : copy.orderPage.payNow}
        </Button>
        <Button disabled={isPaying} onClick={() => void onRetryIntent()} type="button" variant="outline">
          <RefreshCw className="h-4 w-4" />
          {copy.orderPage.paymentRetry}
        </Button>
      </div>
    </div>
  );
}

async function confirmBackendPayment(orderId: string, paymentIntentId: string | undefined, fallbackMessage: string): Promise<ConfirmBackendPaymentResult> {
  const headers = getAuthHeaders();
  headers.set("Content-Type", "application/json");
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);

  const response = await fetch("/api/payments/stripe/confirm", {
    method: "POST",
    headers,
    body: JSON.stringify({
      orderId,
      paymentIntentId,
    }),
    cache: "no-store",
    signal: controller.signal,
  }).catch(() => null);
  window.clearTimeout(timeout);

  if (!response?.ok) {
    const body = response ? await response.json().catch(() => null) : null;
    return {
      ok: false,
      message: resolveErrorMessage(body, fallbackMessage),
    };
  }

  const body = await response.json().catch(() => null);
  return { ok: true, order: extractOrderPayload(body) ?? await fetchPaidOrderSnapshot({ id: orderId, orderId }) };
}

async function fetchPaidOrderSnapshot(order: CheckoutResponse) {
  const orderKey = order.id ?? order.orderId ?? order.orderNumber;

  if (!orderKey) {
    return null;
  }

  const url = new URL("/api/orders", window.location.origin);
  url.searchParams.set("page", "0");
  url.searchParams.set("size", "20");
  url.searchParams.append("sort", "createdAt,desc");

  const response = await fetch(url.toString(), {
    headers: getAuthHeaders(),
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  const body = await response.json().catch(() => null);
  const orders = Array.isArray(body) ? body : isRecord(body) && Array.isArray(body.content) ? body.content : [];

  return orders
    .map((candidate) => normalizePayload<CheckoutResponse>(candidate))
    .filter((candidate): candidate is CheckoutResponse => Boolean(candidate))
    .find((candidate) => isSameOrder(candidate, order)) ?? null;
}

function extractOrderPayload(body: unknown): CheckoutResponse | null {
  const payload = normalizePayload<unknown>(body);

  if (isOrderLike(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return null;
  }

  for (const key of ["order", "data", "result"]) {
    const nested = payload[key];

    if (isOrderLike(nested)) {
      return nested;
    }

    if (isRecord(nested)) {
      for (const nestedKey of ["order", "data", "result"]) {
        const deeper = nested[nestedKey];

        if (isOrderLike(deeper)) {
          return deeper;
        }
      }
    }
  }

  return null;
}

function isOrderLike(value: unknown): value is CheckoutResponse {
  if (!isRecord(value)) {
    return false;
  }

  return ["orderNumber", "orderType", "subtotal", "finalTotal", "taxAmount", "pointsEarned", "items"].some((key) => key in value);
}

function isSameOrder(candidate: CheckoutResponse, order: CheckoutResponse) {
  const candidateKeys = [candidate.id, candidate.orderId, candidate.orderNumber].filter(Boolean);
  const orderKeys = [order.id, order.orderId, order.orderNumber].filter(Boolean);

  return candidateKeys.some((candidateKey) => orderKeys.includes(candidateKey));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function resolveErrorMessage(body: unknown, fallback: string) {
  if (body && typeof body === "object") {
    if ("message" in body && typeof body.message === "string") {
      return body.message;
    }

    if ("error" in body && body.error && typeof body.error === "object" && "message" in body.error && typeof body.error.message === "string") {
      return body.error.message;
    }
  }

  return fallback;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function isSucceededStatus(value: unknown) {
  return typeof value === "string" && ["succeeded", "paid", "PAID"].includes(value);
}

function isPaidOrderStatus(value: unknown) {
  return typeof value === "string" && ["PAID", "COMPLETED"].includes(value.toUpperCase());
}

function getSucceededPaymentIntentId(error: unknown) {
  if (!error || typeof error !== "object" || !("payment_intent" in error)) {
    return undefined;
  }

  const paymentIntent = error.payment_intent;

  if (!paymentIntent || typeof paymentIntent !== "object") {
    return undefined;
  }

  const status = "status" in paymentIntent ? paymentIntent.status : undefined;

  if (!isSucceededStatus(status)) {
    return undefined;
  }

  return "id" in paymentIntent && typeof paymentIntent.id === "string" ? paymentIntent.id : undefined;
}
