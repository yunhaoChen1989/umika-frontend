"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, Gift, History, Share2, Sparkles } from "lucide-react";

import { LoginRedirectLink } from "@/components/auth/login-redirect-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthHeaders, normalizePayload } from "@/lib/cart-client";
import type { Dictionary } from "@/lib/i18n";
import type { RewardRedemptionStatusResponse, RewardSummaryResponse, RewardTransactionResponse, SpringPage } from "@/lib/reward-types";

type RewardsState = {
  summary: RewardSummaryResponse | null;
  redemptionStatus: RewardRedemptionStatusResponse | null;
  transactions: RewardTransactionResponse[];
};

export function RewardsClient({ copy }: { copy: Dictionary }) {
  const searchParams = useSearchParams();
  const [state, setState] = useState<RewardsState>({ summary: null, redemptionStatus: null, transactions: [] });
  const [status, setStatus] = useState<"loading" | "ready" | "unauthenticated" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadRewards() {
      const headers = getAuthHeaders();

      if (!headers.has("Authorization")) {
        setStatus("unauthenticated");
        return;
      }

      setStatus("loading");
      setMessage(null);

      const locationId = searchParams.get("locationId") ?? searchParams.get("location") ?? searchParams.get("storeId") ?? searchParams.get("store");
      const locationCode = searchParams.get("locationCode") ?? searchParams.get("storeCode");
      const summaryUrl = new URL("/api/me/rewards", window.location.origin);
      const redemptionUrl = new URL("/api/me/rewards/redemption-status", window.location.origin);
      const transactionsUrl = new URL("/api/me/rewards/transactions", window.location.origin);

      if (locationId) {
        summaryUrl.searchParams.set("locationId", locationId);
        redemptionUrl.searchParams.set("locationId", locationId);
      }

      if (locationCode) {
        summaryUrl.searchParams.set("locationCode", locationCode);
      }

      transactionsUrl.searchParams.set("page", "0");
      transactionsUrl.searchParams.set("size", "20");

      const [summaryResponse, redemptionResponse, transactionsResponse] = await Promise.all([
        fetch(summaryUrl.toString(), { headers, cache: "no-store" }).catch(() => null),
        fetch(redemptionUrl.toString(), { headers, cache: "no-store" }).catch(() => null),
        fetch(transactionsUrl.toString(), { headers, cache: "no-store" }).catch(() => null),
      ]);

      if (!active) {
        return;
      }

      const failedResponse = [summaryResponse, redemptionResponse, transactionsResponse].find((response) => !response?.ok);

      if (failedResponse) {
        setStatus(failedResponse.status === 401 || failedResponse.status === 403 ? "unauthenticated" : "error");
        const body = await failedResponse.json().catch(() => null);
        setMessage(resolveErrorMessage(body, copy.rewardsPage.loadError));
        return;
      }

      const summary = normalizePayload<RewardSummaryResponse>(await summaryResponse?.json().catch(() => null));
      const redemptionStatus = normalizePayload<RewardRedemptionStatusResponse>(await redemptionResponse?.json().catch(() => null));
      const transactionBody = normalizePayload<SpringPage<RewardTransactionResponse> | RewardTransactionResponse[]>(
        await transactionsResponse?.json().catch(() => null),
      );

      setState({
        summary,
        redemptionStatus,
        transactions: Array.isArray(transactionBody) ? transactionBody : transactionBody?.content ?? [],
      });
      setStatus("ready");
    }

    void loadRewards();

    return () => {
      active = false;
    };
  }, [copy.rewardsPage.loadError, searchParams]);

  const balance = state.summary?.pointsBalance ?? state.summary?.balance ?? state.redemptionStatus?.pointsBalance;
  const pointsPerDollar = state.summary?.pointsPerDollar;
  const pointValueCents = state.summary?.pointsValueCents ?? state.summary?.pointValueCents ?? state.redemptionStatus?.pointsValueCents ?? state.redemptionStatus?.pointValueCents;
  const lifetimeEarned = state.summary?.lifetimePointsEarned ?? state.summary?.lifetimeEarned;
  const lifetimeRedeemed = state.summary?.lifetimePointsRedeemed ?? state.summary?.lifetimeRedeemed;
  const referralCode = state.summary?.referralCode;
  const inviteUrl = state.summary?.referralInviteUrl ?? state.summary?.inviteUrl;
  const redeemablePoints = state.redemptionStatus?.redeemablePoints;
  const redeemableAmount = state.redemptionStatus?.redeemableAmount;
  const minimumRedeemPoints = state.redemptionStatus?.minimumRedeemPoints ?? state.redemptionStatus?.minRedeemPoints ?? state.summary?.minimumRedeemPoints ?? state.summary?.minRedeemPoints;

  async function copyInvite() {
    const value = inviteUrl ?? referralCode;

    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value).catch(() => null);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (status === "loading") {
    return <p className="mx-auto max-w-7xl px-4 py-12 text-sm text-muted-foreground sm:px-6 lg:px-8">{copy.rewardsPage.loading}</p>;
  }

  if (status === "unauthenticated") {
    return (
      <p className="mx-auto max-w-7xl px-4 py-12 text-sm text-muted-foreground sm:px-6 lg:px-8">
        {copy.rewardsPage.loginRequired}{" "}
        <LoginRedirectLink className="font-semibold text-primary underline underline-offset-4">{copy.common.login}</LoginRedirectLink>
      </p>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {status === "error" ? (
        <p className="mb-6 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {message ?? copy.rewardsPage.loadError}
        </p>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg bg-foreground p-7 text-background">
          <Gift className="h-8 w-8 text-amber-200" />
          <h1 className="mt-6 font-serif text-4xl font-semibold sm:text-5xl">
            {formatPoints(balance)} {copy.rewardsPage.points}
          </h1>
          <p className="mt-4 max-w-md text-background/72">
            {copy.rewardsPage.copy}
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <RewardMetric label={copy.rewardsPage.lifetimeEarned} value={formatPoints(lifetimeEarned)} dark />
            <RewardMetric label={copy.rewardsPage.lifetimeRedeemed} value={formatPoints(lifetimeRedeemed)} dark />
          </div>
        </div>
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
              <CardTitle>{copy.rewardsPage.referralCode}</CardTitle>
              <Badge>{copy.rewardsPage.earn}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-md border bg-muted px-4 py-3">
              <span className="min-w-0 break-all font-mono text-sm font-semibold">{referralCode ?? "--"}</span>
              <Button size="icon" variant="ghost" aria-label={copy.rewardsPage.copyCode} onClick={() => void copyInvite()} type="button">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {inviteUrl ? <p className="mt-3 break-all text-xs text-muted-foreground">{inviteUrl}</p> : null}
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {copy.rewardsPage.codeHelp}
            </p>
            {copied ? <p className="mt-3 text-sm font-medium text-primary">{copy.rewardsPage.copied}</p> : null}
          </CardContent>
        </Card>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <RewardMetric label={copy.rewardsPage.redeemablePoints} value={formatPoints(redeemablePoints)} />
        <RewardMetric label={copy.rewardsPage.redeemableAmount} value={formatMoney(redeemableAmount)} />
        <RewardMetric label={copy.rewardsPage.minimumRedeemPoints} value={formatPoints(minimumRedeemPoints)} />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <RuleCard icon={Sparkles} label={copy.rewardsPage.earnRule} value={formatEarnRule(pointsPerDollar, copy.rewardsPage.pointsPerDollar)} />
        <RuleCard icon={Gift} label={copy.rewardsPage.pointValue} value={formatPointValue(pointValueCents)} />
        <RuleCard icon={Share2} label={copy.rewardsPage.referralReward} value={formatReferralReward(state.summary)} />
      </div>
      <div className="mt-8">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-semibold">{copy.rewardsPage.history}</h2>
        </div>
        <div className="mt-4 overflow-hidden rounded-lg border bg-card">
          {state.transactions.length ? (
            state.transactions.map((transaction, index) => (
              <div key={transaction.id ?? `${transaction.type}-${transaction.createdAt}-${index}`} className="grid grid-cols-[1fr_auto] gap-4 border-b p-4 last:border-b-0 sm:grid-cols-[1fr_auto_auto]">
                <div>
                  <p className="font-medium">{transaction.description ?? transaction.orderNumber ?? copy.rewardsPage.transaction}</p>
                  <p className="text-sm text-muted-foreground">{formatTransactionType(transaction.type)}</p>
                </div>
                <span className="text-sm text-muted-foreground">{formatDate(transaction.createdAt)}</span>
                <span className={Number(transaction.points ?? 0) >= 0 ? "font-semibold text-accent" : "font-semibold text-primary"}>
                  {Number(transaction.points ?? 0) > 0 ? "+" : ""}
                  {formatPoints(transaction.points)}
                </span>
              </div>
            ))
          ) : (
            <p className="p-4 text-sm text-muted-foreground">{copy.rewardsPage.emptyHistory}</p>
          )}
        </div>
      </div>
    </section>
  );
}

function RewardMetric({ label, value, dark = false }: { label: string; value: string; dark?: boolean }) {
  return (
    <div className={dark ? "rounded-md border border-background/20 p-3" : "rounded-lg border bg-card p-4"}>
      <p className={dark ? "text-sm text-background/70" : "text-sm text-muted-foreground"}>{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function RuleCard({ icon: Icon, label, value }: { icon: typeof Gift; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <Icon className="h-5 w-5 text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function resolveErrorMessage(body: unknown, fallback: string) {
  if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
    return body.message;
  }

  return fallback;
}

function formatMoney(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `$${value.toFixed(2)}` : "--";
}

function formatPoints(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "--";
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatTransactionType(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "--";
}

function formatEarnRule(pointsPerDollar: number | null | undefined, fallback: string) {
  return typeof pointsPerDollar === "number" && Number.isFinite(pointsPerDollar) ? `$1 = ${pointsPerDollar} pts` : fallback;
}

function formatPointValue(pointValueCents: number | null | undefined) {
  return typeof pointValueCents === "number" && Number.isFinite(pointValueCents) ? `100 pts = $${(pointValueCents * 100 / 100).toFixed(2)}` : "--";
}

function formatReferralReward(summary: RewardSummaryResponse | null) {
  const registerPoints = summary?.referralRegisterPoints;
  const firstOrderPoints = summary?.referralFirstOrderPoints;
  const minimum = summary?.referralFirstOrderMinimum ?? summary?.minReferralOrderAmount;

  if (typeof registerPoints === "number" || typeof firstOrderPoints === "number") {
    const total = Number(registerPoints ?? 0) + Number(firstOrderPoints ?? 0);
    return minimum ? `${total} pts after $${minimum.toFixed(2)} first order` : `${total} pts`;
  }

  return "--";
}
