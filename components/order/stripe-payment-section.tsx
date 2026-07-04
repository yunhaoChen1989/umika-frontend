"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CreditCard, RefreshCw } from "lucide-react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";

import { Button } from "@/components/ui/button";
import { getAuthHeaders, normalizePayload } from "@/lib/cart-client";
import type { CheckoutResponse, StripePaymentIntentResponse } from "@/lib/cart-types";
import type { Dictionary } from "@/lib/i18n";

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

export function StripePaymentSection({
  order,
  copy,
  onPaid,
}: {
  order: CheckoutResponse;
  copy: Dictionary;
  onPaid?: () => void;
}) {
  const orderId = order.id ?? order.orderId;
  const [paymentIntent, setPaymentIntent] = useState<StripePaymentIntentResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "paid" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [dynamicStripePromise, setDynamicStripePromise] = useState<Promise<Stripe | null> | null>(stripePromise);
  const isCreatingIntentRef = useRef(false);

  const createPaymentIntent = useCallback(async () => {
    if (isCreatingIntentRef.current) {
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

    const headers = getAuthHeaders();
    headers.set("Content-Type", "application/json");

    const response = await fetch("/api/payments/stripe/payment-intent", {
      method: "POST",
      headers,
      body: JSON.stringify({ orderId }),
      cache: "no-store",
    }).catch(() => null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      isCreatingIntentRef.current = false;
      setStatus("error");
      setError(resolveErrorMessage(body, copy.orderPage.paymentIntentError));
      return;
    }

    const intent = normalizePayload<StripePaymentIntentResponse>(await response.json().catch(() => null));
    const publishableKey = firstString(intent?.publishableKey, intent?.publishable_key);

    if (publishableKey && !stripePublishableKey) {
      setDynamicStripePromise(loadStripe(publishableKey));
    }

    setPaymentIntent(intent);
    if (isSucceededStatus(intent?.status)) {
      const confirmed = await confirmBackendPayment(orderId, firstString(intent?.paymentIntentId, intent?.payment_intent_id, intent?.id), copy.orderPage.paymentConfirmError);

      if (!confirmed.ok) {
        isCreatingIntentRef.current = false;
        setStatus("error");
        setError(confirmed.message ?? copy.orderPage.paymentConfirmError);
        return;
      }

      isCreatingIntentRef.current = false;
      setStatus("paid");
      onPaid?.();
      return;
    }

    isCreatingIntentRef.current = false;
    setStatus("ready");
  }, [copy.orderPage.paymentConfirmError, copy.orderPage.paymentIntentError, onPaid, orderId]);

  useEffect(() => {
    void createPaymentIntent();
  }, [createPaymentIntent]);

  const clientSecret = firstString(paymentIntent?.clientSecret, paymentIntent?.client_secret);

  if (status === "loading" || status === "idle") {
    return <p className="mt-5 text-sm text-muted-foreground">{copy.orderPage.paymentLoading}</p>;
  }

  if (status === "paid") {
    return (
      <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
        {copy.orderPage.paymentSuccess}
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
          onPaid={() => {
            setStatus("paid");
            onPaid?.();
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
  onPaid: () => void;
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
        onPaid();
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
          onPaid();
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

    onPaid();
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

async function confirmBackendPayment(orderId: string, paymentIntentId: string | undefined, fallbackMessage: string) {
  const headers = getAuthHeaders();
  headers.set("Content-Type", "application/json");

  const response = await fetch("/api/payments/stripe/confirm", {
    method: "POST",
    headers,
    body: JSON.stringify({
      orderId,
      paymentIntentId,
    }),
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    const body = response ? await response.json().catch(() => null) : null;
    return {
      ok: false,
      message: resolveErrorMessage(body, fallbackMessage),
    };
  }

  return { ok: true };
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
