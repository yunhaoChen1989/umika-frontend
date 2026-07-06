/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { BackendMenuItem } from "@/lib/cart-types";
import { resolveBackendMediaUrl } from "@/lib/media-url";
import type { MenuRecommendation, MenuRecommendationPayload } from "@/lib/menu-recommendation-types";

type SpringPage<T> = {
  content?: T[];
};

type RecommendationForm = {
  id: string;
  menuItemId: string;
  title: string;
  subtitle: string;
  sortOrder: string;
  isActive: boolean;
};

const emptyForm: RecommendationForm = {
  id: "",
  menuItemId: "",
  title: "",
  subtitle: "",
  sortOrder: "0",
  isActive: true,
};

export function MenuRecommendationManager() {
  const searchParams = useSearchParams();
  const locationContext = useMemo(() => getStoredLocationContext(searchParams), [searchParams]);
  const locationKey = `${locationContext.locationId ?? ""}:${locationContext.locationCode ?? ""}`;
  const [headerLocationId, setHeaderLocationId] = useState("");
  const [locationReady, setLocationReady] = useState(false);
  const [scope, setScope] = useState<"header" | "global">("header");
  const [recommendations, setRecommendations] = useState<MenuRecommendation[]>([]);
  const [menuItems, setMenuItems] = useState<BackendMenuItem[]>([]);
  const [form, setForm] = useState<RecommendationForm>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "saving">("idle");
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

  const loadData = useCallback(async () => {
    if (!locationReady) {
      return;
    }

    setStatus("loading");
    setError(null);
    setMessage(null);

    const recommendationUrl = new URL("/api/manager/menu-recommendations", window.location.origin);
    recommendationUrl.searchParams.set("page", "0");
    recommendationUrl.searchParams.set("size", "20");
    recommendationUrl.searchParams.append("sort", "sortOrder,asc");

    const menuItemsUrl = new URL("/api/manager/menu-items", window.location.origin);
    menuItemsUrl.searchParams.set("page", "0");
    menuItemsUrl.searchParams.set("size", "200");
    menuItemsUrl.searchParams.append("sort", "name,asc");

    if (selectedLocationId) {
      recommendationUrl.searchParams.set("locationId", selectedLocationId);
      menuItemsUrl.searchParams.set("locationId", selectedLocationId);
    }

    const [recommendationResponse, menuItemsResponse] = await Promise.all([
      fetch(recommendationUrl.toString(), { headers: getAuthHeaders(), cache: "no-store" }).catch(() => null),
      fetch(menuItemsUrl.toString(), { headers: getAuthHeaders(), cache: "no-store" }).catch(() => null),
    ]);

    if (!recommendationResponse?.ok) {
      const body = recommendationResponse ? await recommendationResponse.json().catch(() => null) : null;
      setRecommendations([]);
      setStatus("idle");
      setError(getApiErrorMessage(body, "Unable to load menu recommendations."));
      return;
    }

    if (!menuItemsResponse?.ok) {
      const body = menuItemsResponse ? await menuItemsResponse.json().catch(() => null) : null;
      setMenuItems([]);
      setStatus("idle");
      setError(getApiErrorMessage(body, "Unable to load menu items."));
      return;
    }

    const recommendationBody = (await recommendationResponse.json().catch(() => null)) as SpringPage<MenuRecommendation> | MenuRecommendation[] | null;
    const menuItemsBody = (await menuItemsResponse.json().catch(() => null)) as SpringPage<BackendMenuItem> | BackendMenuItem[] | null;
    setRecommendations(Array.isArray(recommendationBody) ? recommendationBody : recommendationBody?.content ?? []);
    setMenuItems(Array.isArray(menuItemsBody) ? menuItemsBody : menuItemsBody?.content ?? []);
    setStatus("idle");
  }, [locationReady, selectedLocationId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function openCreateDialog() {
    setForm({
      ...emptyForm,
      menuItemId: menuItems[0]?.id ?? "",
      sortOrder: String(recommendations.length),
    });
    setError(null);
    setDialogOpen(true);
  }

  function openEditDialog(item: MenuRecommendation) {
    setForm({
      id: item.id,
      menuItemId: item.menuItemId,
      title: item.title ?? "",
      subtitle: item.subtitle ?? "",
      sortOrder: String(item.sortOrder ?? 0),
      isActive: item.isActive !== false,
    });
    setError(null);
    setDialogOpen(true);
  }

  async function saveRecommendation() {
    if (!form.menuItemId) {
      setError("Select a menu item.");
      return;
    }

    const payload: MenuRecommendationPayload = {
      locationId: selectedLocationId || null,
      menuItemId: form.menuItemId,
      title: form.title.trim() || null,
      subtitle: form.subtitle.trim() || null,
      sortOrder: Number(form.sortOrder || 0),
      isActive: form.isActive,
    };

    setStatus("saving");
    setError(null);
    setMessage(null);

    const response = await fetch(form.id ? `/api/manager/menu-recommendations/${encodeURIComponent(form.id)}` : "/api/manager/menu-recommendations", {
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
      setError(getApiErrorMessage(body, "Unable to save recommendation."));
      return;
    }

    setDialogOpen(false);
    setMessage(form.id ? "Recommendation updated." : "Recommendation created.");
    await loadData();
  }

  async function deleteRecommendation(item: MenuRecommendation) {
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/manager/menu-recommendations/${encodeURIComponent(item.id)}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
      cache: "no-store",
    }).catch(() => null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setError(getApiErrorMessage(body, "Unable to delete recommendation."));
      return;
    }

    setMessage("Recommendation deleted.");
    await loadData();
  }

  async function updateLocationVisibility(item: MenuRecommendation, isVisible: boolean) {
    if (!selectedLocationId) {
      setError("Select a header location before changing location visibility.");
      return;
    }

    setError(null);
    setMessage(null);

    const response = await fetch("/api/manager/menu-recommendations/location-visibility", {
      method: "PATCH",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locationId: selectedLocationId,
        menuItemId: item.menuItemId,
        isVisible,
      }),
      cache: "no-store",
    }).catch(() => null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setError(getApiErrorMessage(body, "Unable to update location visibility."));
      return;
    }

    setMessage(isVisible ? "Recommendation is visible for this location." : "Recommendation is hidden for this location.");
    await loadData();
  }

  return (
    <div className="space-y-5">
      {error ? <Alert tone="error" message={error} /> : null}
      {message ? <Alert tone="success" message={message} /> : null}

      <Card className="rounded-md shadow-none">
        <CardHeader className="border-b border-slate-200">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div>
              <CardTitle className="text-base">Global recommendation setting</CardTitle>
              <p className="mt-2 text-sm text-slate-500">
                {scope === "global"
                  ? "Editing global homepage recommendations."
                  : selectedLocationId
                    ? `Editing recommendations for header location ${selectedLocationId}.`
                    : "No header location is selected. Global recommendations are shown."}
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
              <CardTitle className="text-base">Recommended items</CardTitle>
              <p className="mt-2 text-sm text-slate-500">
                {scope === "global"
                  ? "Global recommendations use no locationId."
                  : selectedLocationId
                    ? "Visibility switches use locationItemVisible for this header location."
                    : "No header location selected. Visibility switches are disabled."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void loadData()} disabled={status === "loading"}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button type="button" onClick={openCreateDialog}>
                <Plus className="h-4 w-4" />
                Add recommendation
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {status === "loading" ? <div className="p-5 text-sm text-slate-500">Loading recommendations...</div> : null}
          {status !== "loading" && recommendations.length === 0 ? <div className="p-5 text-sm text-slate-500">No recommendations for this scope yet.</div> : null}
          {recommendations.length ? (
            <div className="divide-y divide-slate-200">
              {recommendations.map((item) => {
                const title = item.title?.trim() || item.itemName || item.menuItemId;
                const subtitle = item.subtitle?.trim() || item.itemDescription || "";
                const visibility = resolveVisibilityState(item);

                return (
                  <div className="grid gap-3 px-4 py-3 text-sm lg:grid-cols-[72px_1fr_110px_110px_120px_170px] lg:items-center" key={item.id}>
                    <div className="h-16 w-16 overflow-hidden rounded-md bg-slate-100">
                      {item.imageUrl ? <img alt={title} className="h-full w-full object-cover" src={resolveBackendMediaUrl(item.imageUrl)} /> : null}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950">{title}</p>
                        <Badge>{item.locationId ? "Location" : "Global"}</Badge>
                        {item.isActive === false ? <Badge>Inactive</Badge> : null}
                        {visibility === "unknown" ? null : visibility ? <Badge>Visible here</Badge> : <Badge>Hidden here</Badge>}
                      </div>
                      {subtitle ? <p className="mt-1 line-clamp-2 text-slate-500">{subtitle}</p> : null}
                    </div>
                    <p className="font-semibold text-slate-950">{formatMoney(item.price)}</p>
                    <p className="text-slate-500">Sort {item.sortOrder ?? 0}</p>
                    <div className="flex items-center gap-3">
                      <VisibilitySwitch
                        checked={visibility === true}
                        disabled={scope === "global" || !selectedLocationId || visibility === "unknown"}
                        label={`${visibility === false ? "Show" : "Hide"} ${title} for this location`}
                        onChange={(nextVisible) => void updateLocationVisibility(item, nextVisible)}
                      />
                      <span className="text-xs text-slate-500">
                        {scope === "global" ? "Global" : visibility === "unknown" ? "Global" : visibility ? "Visible" : "Hidden"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Button type="button" variant="outline" size="icon" aria-label={`Edit ${title}`} onClick={() => openEditDialog(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="outline" size="icon" aria-label={`Delete ${title}`} onClick={() => void deleteRecommendation(item)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit recommendation" : "Add recommendation"}</DialogTitle>
            <DialogDescription>Recommendations display on the homepage exactly as returned by the backend.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Menu item</span>
              <select
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={form.menuItemId}
                onChange={(event) => setForm((current) => ({ ...current, menuItemId: event.target.value }))}
              >
                <option value="">Select item</option>
                {menuItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} {item.price !== null && item.price !== undefined ? `- ${formatMoney(item.price)}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Custom title</span>
              <input className={inputClass} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Sort order</span>
              <input
                className={inputClass}
                type="number"
                min="0"
                value={form.sortOrder}
                onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))}
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Custom subtitle</span>
              <textarea
                className="min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={form.subtitle}
                onChange={(event) => setForm((current) => ({ ...current, subtitle: event.target.value }))}
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
              Active
            </label>
            {error ? <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive md:col-span-2">{error}</div> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={status === "saving"} onClick={() => void saveRecommendation()}>
              {status === "saving" ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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

function VisibilitySwitch({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-checked={checked}
      className={[
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors",
        checked ? "border-primary bg-primary" : "border-slate-300 bg-slate-200",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      ].join(" ")}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      role="switch"
    >
      <span
        className={[
          "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        ].join(" ")}
      />
    </button>
  );
}

function resolveVisibilityState(item: MenuRecommendation): boolean | "unknown" {
  if (typeof item.locationItemVisible === "boolean") {
    return item.locationItemVisible;
  }

  if (typeof item.isVisible === "boolean") {
    return item.isVisible;
  }

  return "unknown";
}

const inputClass = "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

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
  const response = await fetch(url.toString(), { headers: getAuthHeaders(), cache: "no-store" }).catch(() => null);

  if (!response?.ok) {
    return "";
  }

  const body = (await response.json().catch(() => null)) as { locationId?: string; id?: string } | string | null;
  return typeof body === "string" ? body.trim() : body?.locationId ?? body?.id ?? "";
}

function getApiErrorMessage(body: unknown, fallback: string) {
  if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
    return body.message;
  }

  return fallback;
}

function formatMoney(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(value)
    : "--";
}
