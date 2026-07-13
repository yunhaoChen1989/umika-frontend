"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Info, Pencil, Plus, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Coupon, CouponDiscountType, CouponPayload } from "@/lib/coupon-types";

type SpringPage<T> = {
  content?: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
};

type CouponForm = {
  id: string;
  code: string;
  name: string;
  description: string;
  discountType: CouponDiscountType;
  discountValue: string;
  minimumOrderAmount: string;
  maximumDiscountAmount: string;
  startsAt: string;
  endsAt: string;
  usageLimitTotal: string;
  usageLimitPerUser: string;
  firstOrderOnly: boolean;
  newCustomerOnly: boolean;
  isActive: boolean;
};

const emptyForm: CouponForm = {
  id: "",
  code: "",
  name: "",
  description: "",
  discountType: "PERCENT",
  discountValue: "",
  minimumOrderAmount: "",
  maximumDiscountAmount: "",
  startsAt: "",
  endsAt: "",
  usageLimitTotal: "",
  usageLimitPerUser: "",
  firstOrderOnly: false,
  newCustomerOnly: false,
  isActive: true,
};

const inputClass = "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
const couponTooltips = {
  totalUsageLimit: "Maximum number of times this coupon can be used by all customers combined. Leave empty for unlimited total uses.",
  perUserUsageLimit: "Maximum number of times one customer can use this coupon. Example: 1 means each customer can use it once.",
  firstOrderOnly: "Only customers who have never placed a paid order before can use this coupon.",
  newCustomerOnly:
    "Only customers with no previous paid orders can use this coupon. Currently this behaves the same as “First Order Only,” but it is kept as a separate rule in case the business later defines “new customer” differently.",
} as const;

export function CouponManager() {
  const searchParams = useSearchParams();
  const locationContext = useMemo(() => getStoredLocationContext(searchParams), [searchParams]);
  const locationKey = `${locationContext.locationId ?? ""}:${locationContext.locationCode ?? ""}`;
  const [headerLocationId, setHeaderLocationId] = useState("");
  const [locationReady, setLocationReady] = useState(false);
  const [scope, setScope] = useState<"header" | "global">("header");
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pageNumber, setPageNumber] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "saving">("idle");
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedLocationId = scope === "global" ? "" : headerLocationId;

  useEffect(() => {
    let active = true;
    setLocationReady(false);

    async function resolveHeaderLocation() {
      const locationId = await resolveLocationId(locationContext);

      if (!active) {
        return;
      }

      setHeaderLocationId(locationId);
      setLocationReady(true);
      if (locationId) {
        setScope("header");
      }
    }

    void resolveHeaderLocation();

    return () => {
      active = false;
    };
  }, [locationContext, locationKey]);

  const loadCoupons = useCallback(async (page = pageNumber) => {
    if (!locationReady) {
      return;
    }

    setStatus("loading");
    setMessage(null);
    setError(null);

    const url = new URL("/api/manager/coupons", window.location.origin);
    url.searchParams.set("page", String(Math.max(0, page)));
    url.searchParams.set("size", "20");
    url.searchParams.set("sort", "createdAt,desc");

    if (selectedLocationId) {
      url.searchParams.set("locationId", selectedLocationId);
    }

    const response = await fetch(url.toString(), {
      headers: getAuthHeaders(),
      cache: "no-store",
    }).catch(() => null);

    setStatus("idle");

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setCoupons([]);
      setError(getApiErrorMessage(body, "Unable to load coupons."));
      return;
    }

    const body = (await response.json().catch(() => null)) as SpringPage<Coupon> | Coupon[] | null;
    const items = Array.isArray(body) ? body : body?.content ?? [];
    setCoupons(items);
    setPageNumber(Array.isArray(body) ? 0 : body?.number ?? page);
    setTotalPages(Array.isArray(body) ? (items.length ? 1 : 0) : body?.totalPages ?? 0);
    setTotalElements(Array.isArray(body) ? items.length : body?.totalElements ?? items.length);
  }, [locationReady, pageNumber, selectedLocationId]);

  useEffect(() => {
    void loadCoupons(0);
  }, [loadCoupons, locationKey, selectedLocationId]);

  function openCreateDialog() {
    setForm(emptyForm);
    setError(null);
    setDialogOpen(true);
  }

  function openEditDialog(coupon: Coupon) {
    setForm({
      id: coupon.id,
      code: coupon.code ?? "",
      name: coupon.name ?? "",
      description: coupon.description ?? "",
      discountType: coupon.discountType ?? "PERCENT",
      discountValue: numberToInput(coupon.discountValue),
      minimumOrderAmount: numberToInput(coupon.minimumOrderAmount),
      maximumDiscountAmount: numberToInput(coupon.maximumDiscountAmount),
      startsAt: toDateTimeInput(coupon.startsAt),
      endsAt: toDateTimeInput(coupon.endsAt),
      usageLimitTotal: numberToInput(coupon.usageLimitTotal),
      usageLimitPerUser: numberToInput(coupon.usageLimitPerUser),
      firstOrderOnly: coupon.firstOrderOnly === true,
      newCustomerOnly: coupon.newCustomerOnly === true,
      isActive: coupon.isActive !== false,
    });
    setError(null);
    setDialogOpen(true);
  }

  async function saveCoupon() {
    if (!form.code.trim() || !form.name.trim()) {
      setError("Coupon code and name are required.");
      return;
    }

    const discountValue = toNumber(form.discountValue);
    if (discountValue === null || discountValue <= 0) {
      setError("Discount value must be greater than 0.");
      return;
    }

    const payload: CouponPayload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      discountType: form.discountType,
      discountValue,
      minimumOrderAmount: toNumber(form.minimumOrderAmount),
      maximumDiscountAmount: toNumber(form.maximumDiscountAmount),
      locationId: selectedLocationId || null,
      startsAt: form.startsAt || null,
      endsAt: form.endsAt || null,
      usageLimitTotal: toInteger(form.usageLimitTotal),
      usageLimitPerUser: toInteger(form.usageLimitPerUser),
      firstOrderOnly: form.firstOrderOnly,
      newCustomerOnly: form.newCustomerOnly,
      isActive: form.isActive,
    };

    setStatus("saving");
    setMessage(null);
    setError(null);

    const response = await fetch(form.id ? `/api/manager/coupons/${encodeURIComponent(form.id)}` : "/api/manager/coupons", {
      method: form.id ? "PUT" : "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    }).catch(() => null);

    setStatus("idle");

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setError(getApiErrorMessage(body, "Unable to save coupon."));
      return;
    }

    setDialogOpen(false);
    setMessage(form.id ? "Coupon updated." : "Coupon created.");
    await loadCoupons(pageNumber);
  }

  async function updateCouponStatus(coupon: Coupon, isActive: boolean) {
    setPendingStatusId(coupon.id);
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/manager/coupons/${encodeURIComponent(coupon.id)}/status`, {
      method: "PATCH",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isActive }),
      cache: "no-store",
    }).catch(() => null);

    setPendingStatusId(null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setError(getApiErrorMessage(body, "Unable to update coupon status."));
      return;
    }

    setMessage(isActive ? "Coupon activated." : "Coupon deactivated.");
    await loadCoupons(pageNumber);
  }

  return (
    <div className="space-y-5">
      {error ? <Alert tone="error" message={error} /> : null}
      {message ? <Alert tone="success" message={message} /> : null}

      <Card className="rounded-md shadow-none">
        <CardHeader className="border-b border-slate-200">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div>
              <CardTitle className="text-base">Coupon scope</CardTitle>
              <p className="mt-2 text-sm text-slate-500">
                {scope === "global"
                  ? "Managing global coupons with locationId null."
                  : selectedLocationId
                    ? `Managing coupons for header location ${selectedLocationId}.`
                    : "No header location selected. Global coupons are shown."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant={scope === "header" ? "default" : "outline"} disabled={!headerLocationId} onClick={() => setScope("header")}>
                Header location
              </Button>
              <Button type="button" variant={scope === "global" ? "default" : "outline"} onClick={() => setScope("global")}>
                Global
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="overflow-hidden rounded-md shadow-none">
        <CardHeader className="border-b border-slate-200">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <CardTitle className="text-base">Coupons</CardTitle>
              <p className="mt-2 text-sm text-slate-500">{totalElements} total coupon rules. Use status changes instead of deletion.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void loadCoupons(pageNumber)} disabled={status === "loading"}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button type="button" onClick={openCreateDialog}>
                <Plus className="h-4 w-4" />
                Add coupon
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {status === "loading" ? <div className="p-5 text-sm text-slate-500">Loading coupons...</div> : null}
          {status !== "loading" && coupons.length === 0 ? <div className="p-5 text-sm text-slate-500">No coupons found for this scope.</div> : null}
          {coupons.length ? (
            <div className="divide-y divide-slate-200">
              {coupons.map((coupon) => (
                <div className="grid gap-3 px-4 py-3 text-sm xl:grid-cols-[1.2fr_110px_140px_140px_170px_160px] xl:items-center" key={coupon.id}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-950">{coupon.code}</p>
                      <Badge>{coupon.locationId ? "Location" : "Global"}</Badge>
                      <Badge className={coupon.isActive === false ? "bg-slate-100 text-slate-700" : "bg-emerald-50 text-emerald-800"}>
                        {coupon.isActive === false ? "Inactive" : "Active"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-slate-700">{coupon.name}</p>
                    {coupon.description ? <p className="mt-1 line-clamp-2 text-xs text-slate-500">{coupon.description}</p> : null}
                  </div>
                  <p className="font-semibold text-slate-950">{formatDiscount(coupon)}</p>
                  <p className="text-slate-500">Min {formatMoney(coupon.minimumOrderAmount)}</p>
                  <p className="text-slate-500">Max {formatMoney(coupon.maximumDiscountAmount)}</p>
                  <p className="text-slate-500">{formatDateRange(coupon.startsAt, coupon.endsAt)}</p>
                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <Button type="button" variant="outline" size="icon" aria-label={`Edit ${coupon.code}`} onClick={() => openEditDialog(coupon)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant={coupon.isActive === false ? "default" : "outline"}
                      disabled={pendingStatusId === coupon.id}
                      onClick={() => void updateCouponStatus(coupon, coupon.isActive === false)}
                    >
                      {coupon.isActive === false ? "Activate" : "Deactivate"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">Page {totalPages === 0 ? 0 : pageNumber + 1} of {totalPages}</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" disabled={status === "loading" || pageNumber <= 0} onClick={() => void loadCoupons(pageNumber - 1)}>
                Previous
              </Button>
              <Button type="button" variant="outline" disabled={status === "loading" || pageNumber + 1 >= totalPages} onClick={() => void loadCoupons(pageNumber + 1)}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[min(96vw,52rem)]">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit coupon" : "Add coupon"}</DialogTitle>
            <DialogDescription>Backend validates and applies coupon rules. The frontend does not calculate coupon discounts.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <Field label="Code">
              <input className={inputClass} value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} />
            </Field>
            <Field label="Name">
              <input className={inputClass} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </Field>
            <Field label="Discount type">
              <select className={inputClass} value={form.discountType} onChange={(event) => setForm((current) => ({ ...current, discountType: event.target.value as CouponDiscountType }))}>
                <option value="PERCENT">Percent</option>
                <option value="FIXED_AMOUNT">Fixed amount</option>
              </select>
            </Field>
            <Field label="Discount value">
              <input className={inputClass} type="number" min="0" step="0.01" value={form.discountValue} onChange={(event) => setForm((current) => ({ ...current, discountValue: event.target.value }))} />
            </Field>
            <Field label="Minimum order amount">
              <input className={inputClass} type="number" min="0" step="0.01" value={form.minimumOrderAmount} onChange={(event) => setForm((current) => ({ ...current, minimumOrderAmount: event.target.value }))} />
            </Field>
            <Field label="Maximum discount amount">
              <input className={inputClass} type="number" min="0" step="0.01" value={form.maximumDiscountAmount} onChange={(event) => setForm((current) => ({ ...current, maximumDiscountAmount: event.target.value }))} />
            </Field>
            <Field label="Starts at">
              <input className={inputClass} type="datetime-local" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} />
            </Field>
            <Field label="Ends at">
              <input className={inputClass} type="datetime-local" value={form.endsAt} onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))} />
            </Field>
            <Field label="Total usage limit" tooltip={couponTooltips.totalUsageLimit}>
              <input className={inputClass} type="number" min="0" step="1" value={form.usageLimitTotal} onChange={(event) => setForm((current) => ({ ...current, usageLimitTotal: event.target.value }))} />
            </Field>
            <Field label="Per-user usage limit" tooltip={couponTooltips.perUserUsageLimit}>
              <input className={inputClass} type="number" min="0" step="1" value={form.usageLimitPerUser} onChange={(event) => setForm((current) => ({ ...current, usageLimitPerUser: event.target.value }))} />
            </Field>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Description</span>
              <textarea className="min-h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <div className="flex flex-wrap gap-4 md:col-span-2">
              <Checkbox label="First order only" tooltip={couponTooltips.firstOrderOnly} checked={form.firstOrderOnly} onChange={(firstOrderOnly) => setForm((current) => ({ ...current, firstOrderOnly }))} />
              <Checkbox label="New customer only" tooltip={couponTooltips.newCustomerOnly} tooltipAlign="right" checked={form.newCustomerOnly} onChange={(newCustomerOnly) => setForm((current) => ({ ...current, newCustomerOnly }))} />
              <Checkbox label="Active" checked={form.isActive} onChange={(isActive) => setForm((current) => ({ ...current, isActive }))} />
            </div>
            {error ? <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive md:col-span-2">{error}</div> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="button" disabled={status === "saving"} onClick={() => void saveCoupon()}>{status === "saving" ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, tooltip, children }: { label: string; tooltip?: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
        {label}
        {tooltip ? <TooltipInfo label={label} text={tooltip} /> : null}
      </span>
      {children}
    </label>
  );
}

function Checkbox({
  label,
  tooltip,
  tooltipAlign = "left",
  checked,
  onChange,
}: {
  label: string;
  tooltip?: string;
  tooltipAlign?: "left" | "right";
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="flex items-center gap-1.5">
        {label}
        {tooltip ? <TooltipInfo align={tooltipAlign} label={label} text={tooltip} /> : null}
      </span>
    </label>
  );
}

function TooltipInfo({ align = "left", label, text }: { align?: "left" | "right"; label: string; text: string }) {
  return (
    <span
      aria-label={`${label}: ${text}`}
      className="group relative inline-flex cursor-help"
      tabIndex={0}
    >
      <Info className="h-3.5 w-3.5 text-slate-400" />
      <span
        className={[
          "pointer-events-none absolute bottom-full z-[80] mb-2 hidden w-72 max-w-[calc(100vw-3rem)] rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-normal leading-5 text-slate-700 shadow-xl group-hover:block group-focus:block",
          align === "right" ? "right-0" : "left-0",
        ].join(" ")}
      >
        {text}
      </span>
    </span>
  );
}

function Alert({ tone, message }: { tone: "error" | "success"; message: string }) {
  const Icon = tone === "error" ? AlertCircle : CheckCircle2;
  return (
    <div className={tone === "error" ? "flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" : "flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{message}</p>
    </div>
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

function getApiErrorMessage(body: unknown, fallback: string) {
  if (body && typeof body === "object") {
    if ("message" in body && typeof body.message === "string" && body.message.trim()) {
      return body.message;
    }
    if ("error" in body && body.error && typeof body.error === "object" && "message" in body.error && typeof body.error.message === "string") {
      return body.error.message;
    }
  }

  return fallback;
}

function toNumber(value: string) {
  if (!value.trim()) {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toInteger(value: string) {
  const number = toNumber(value);
  return number === null ? null : Math.trunc(number);
}

function numberToInput(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function toDateTimeInput(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 16);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatDiscount(coupon: Coupon) {
  if (coupon.discountType === "PERCENT") {
    return `${coupon.discountValue}%`;
  }
  return formatMoney(coupon.discountValue);
}

function formatMoney(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "--";
  }
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(value);
}

function formatDateRange(startsAt: string | null | undefined, endsAt: string | null | undefined) {
  if (!startsAt && !endsAt) {
    return "No date limit";
  }
  return `${formatDate(startsAt)} - ${formatDate(endsAt)}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "open";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
