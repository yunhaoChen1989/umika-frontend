"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, RefreshCw, Save, Search, ShieldCheck, Trash2, X } from "lucide-react";

import { LoginRedirectLink } from "@/components/auth/login-redirect-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LocationDto, SpringPage } from "@/lib/location-types";
import { cn } from "@/lib/utils";

type CurrentAccountProfile = {
  role?: string | null;
  roles?: string[] | null;
};

type BusinessSettingSource = "SYSTEM" | "LOCATION";

type BusinessSetting = {
  settingGroup: string;
  settingKey: string;
  label?: string | null;
  description?: string | null;
  unit?: string | null;
  systemValue?: string | null;
  locationValue?: string | null;
  effectiveValue?: string | null;
  source: BusinessSettingSource;
};

type BusinessSettingsResponse = {
  locationId?: string | null;
  locationCode?: string | null;
  locationName?: string | null;
  settings?: BusinessSetting[];
};

type SettingDraft = {
  value: string;
  originalValue: string;
};

const STORE_CHANGE_ROLES = new Set(["ROLE_ADMIN", "ADMIN"]);
const NUMBER_KEYS = new Set([
  "DEFAULT_TAX_RATE",
  "ORDER_DISCOUNT_PERCENT",
  "ORDER_DISCOUNT_AMOUNT",
  "POINTS_PER_DOLLAR",
  "POINT_VALUE_CENTS",
  "MAX_REDEMPTION_PERCENT",
  "BIRTHDAY_BONUS_POINTS",
  "REFERRAL_SIGNUP_POINTS",
  "REFERRAL_FIRST_ORDER_POINTS",
  "MIN_REFERRAL_ORDER_AMOUNT",
]);

const FALLBACK_LABELS: Record<string, string> = {
  DEFAULT_TAX_RATE: "Tax rate",
  ORDER_DISCOUNT_PERCENT: "Order discount percent",
  ORDER_DISCOUNT_AMOUNT: "Order discount amount",
  POINTS_PER_DOLLAR: "Points per dollar",
  POINT_VALUE_CENTS: "Point value",
  MAX_REDEMPTION_PERCENT: "Maximum redemption percent",
  BIRTHDAY_BONUS_POINTS: "Birthday bonus points",
  REFERRAL_SIGNUP_POINTS: "Referral signup points",
  REFERRAL_FIRST_ORDER_POINTS: "Referral first order points",
  MIN_REFERRAL_ORDER_AMOUNT: "Minimum referral order amount",
};

export function LocationSettingManager() {
  const [locations, setLocations] = useState<LocationDto[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [locationSelectionSource, setLocationSelectionSource] = useState<"stored" | "manual" | null>(null);
  const [effectiveSettings, setEffectiveSettings] = useState<BusinessSettingsResponse | null>(null);
  const [drafts, setDrafts] = useState<Record<string, SettingDraft>>({});
  const [status, setStatus] = useState<"loading" | "ready" | "unauthenticated" | "error">("loading");
  const [settingsStatus, setSettingsStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [canChangeStore, setCanChangeStore] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [resettingKey, setResettingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const locationById = useMemo(() => new Map(locations.map((location) => [location.id, location])), [locations]);
  const selectedLocation = selectedLocationId ? locationById.get(selectedLocationId) ?? null : null;
  const locationLocked = Boolean(selectedLocationId) && !canChangeStore;
  const isGlobalMode = !selectedLocationId;

  const filteredLocations = useMemo(() => {
    const query = locationQuery.trim().toLowerCase();

    if (!query) {
      return locations.slice(0, 8);
    }

    return locations
      .filter((location) =>
        [location.name, location.locationCode, location.addressLine1, location.city, location.province]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query)),
      )
      .slice(0, 12);
  }, [locationQuery, locations]);

  const groupedSettings = useMemo(() => {
    const groups = new Map<string, BusinessSetting[]>();

    for (const setting of effectiveSettings?.settings ?? []) {
      const group = setting.settingGroup || "GENERAL";
      groups.set(group, [...(groups.get(group) ?? []), setting]);
    }

    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [effectiveSettings]);

  const loadShell = useCallback(async () => {
    setStatus("loading");
    setError(null);

    const headers = getAuthHeaders();
    const [profileResponse, locationsResponse] = await Promise.all([
      fetch("/api/me/profile", { method: "GET", headers, cache: "no-store" }).catch(() => null),
      fetch("/api/manager/locations?page=0&size=300&sort=name,asc", { headers, cache: "no-store" }).catch(() => null),
    ]);

    if (!profileResponse?.ok) {
      const body = profileResponse ? await profileResponse.json().catch(() => null) : null;
      setStatus(profileResponse?.status === 401 || profileResponse?.status === 403 ? "unauthenticated" : "error");
      setError(getManagerErrorMessage(profileResponse?.status, body, "Unable to load account profile."));
      return;
    }

    const profile = (await profileResponse.json().catch(() => null)) as CurrentAccountProfile | null;
    const roles = [...(profile?.roles ?? []), profile?.role]
      .filter((role): role is string => Boolean(role))
      .map((role) => role.toUpperCase());
    setCanChangeStore(roles.some((role) => STORE_CHANGE_ROLES.has(role)));

    if (!locationsResponse?.ok) {
      const body = locationsResponse ? await locationsResponse.json().catch(() => null) : null;
      setStatus(locationsResponse?.status === 401 || locationsResponse?.status === 403 ? "unauthenticated" : "error");
      setError(getManagerErrorMessage(locationsResponse?.status, body, "Unable to load store locations."));
      return;
    }

    const locationsPage = (await locationsResponse.json()) as SpringPage<LocationDto>;
    setLocations(locationsPage.content ?? []);
    setStatus("ready");
  }, []);

  const loadEffectiveSettings = useCallback(async (locationId: string) => {
    setSettingsStatus("loading");
    setError(null);

    const url = new URL("/api/manager/business-settings/effective", window.location.origin);

    if (locationId) {
      url.searchParams.set("locationId", locationId);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: getAuthHeaders(),
      cache: "no-store",
    }).catch(() => null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setEffectiveSettings(null);
      setDrafts({});
      setSettingsStatus("error");
      setError(getManagerErrorMessage(response?.status, body, "Unable to load business settings."));
      return;
    }

    const body = (await response.json()) as BusinessSettingsResponse;
    const settings = body.settings ?? [];

    setEffectiveSettings({ ...body, settings });
    setDrafts(
      Object.fromEntries(
        settings.map((setting) => {
          const value = setting.effectiveValue ?? "";
          return [setting.settingKey, { value, originalValue: value }];
        }),
      ),
    );
    setSettingsStatus("ready");
  }, []);

  useEffect(() => {
    void loadShell();
  }, [loadShell]);

  useEffect(() => {
    if (locationSelectionSource !== null || selectedLocationId || locations.length === 0 || canChangeStore) {
      return;
    }

    const storedLocation = getStoredLocationContext();

    if (!storedLocation.locationId && !storedLocation.locationCode) {
      return;
    }

    const matchedLocation = locations.find(
      (location) => location.id === storedLocation.locationId || location.locationCode === storedLocation.locationCode,
    );

    if (!matchedLocation?.id) {
      return;
    }

    setSelectedLocationId(matchedLocation.id);
    setLocationQuery(matchedLocation.name);
    setLocationSelectionSource("stored");
  }, [canChangeStore, locationSelectionSource, locations, selectedLocationId]);

  useEffect(() => {
    if (status !== "ready") {
      return;
    }

    void loadEffectiveSettings(selectedLocationId);
  }, [loadEffectiveSettings, selectedLocationId, status]);

  function selectLocation(location: LocationDto) {
    if (locationLocked) {
      return;
    }

    setSelectedLocationId(location.id ?? "");
    setLocationQuery(location.name);
    setLocationSelectionSource("manual");
    setMessage(null);
    setError(null);
  }

  function clearSelection() {
    if (locationLocked) {
      return;
    }

    setSelectedLocationId("");
    setLocationQuery("");
    setLocationSelectionSource("manual");
    setMessage(null);
    setError(null);
  }

  function updateDraft(settingKey: string, value: string) {
    setDrafts((current) => ({
      ...current,
      [settingKey]: {
        originalValue: current[settingKey]?.originalValue ?? "",
        value,
      },
    }));
  }

  async function saveSetting(setting: BusinessSetting) {
    const draft = drafts[setting.settingKey];
    const settingValue = (draft?.value ?? "").trim();

    setSavingKey(setting.settingKey);
    setMessage(null);
    setError(null);

    const response = await fetch(
      isGlobalMode
        ? "/api/manager/business-settings/system"
        : `/api/manager/business-settings/location/${encodeURIComponent(selectedLocationId)}`,
      {
        method: "PUT",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          settings: [
            {
              settingKey: setting.settingKey,
              settingValue,
            },
          ],
        }),
        cache: "no-store",
      },
    ).catch(() => null);

    setSavingKey(null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setError(getManagerErrorMessage(response?.status, body, "Unable to save business setting."));
      return;
    }

    setMessage(`${getSettingLabel(setting)} saved.`);
    await loadEffectiveSettings(selectedLocationId);
  }

  async function resetSetting(setting: BusinessSetting) {
    if (isGlobalMode) {
      return;
    }

    setResettingKey(setting.settingKey);
    setMessage(null);
    setError(null);

    const response = await fetch(
      `/api/manager/business-settings/location/${encodeURIComponent(selectedLocationId)}/${encodeURIComponent(setting.settingKey)}`,
      {
        method: "DELETE",
        headers: getAuthHeaders(),
        cache: "no-store",
      },
    ).catch(() => null);

    setResettingKey(null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setError(getManagerErrorMessage(response?.status, body, "Unable to reset business setting."));
      return;
    }

    setMessage(`${getSettingLabel(setting)} reset to the system value.`);
    await loadEffectiveSettings(selectedLocationId);
  }

  if (status === "unauthenticated") {
    return (
      <Card className="rounded-md shadow-none">
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">{error ?? "Log in with an admin account to manage store settings."}</p>
          <Button asChild className="w-full sm:w-auto">
            <LoginRedirectLink>Login</LoginRedirectLink>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          disabled={status === "loading" || settingsStatus === "loading"}
          onClick={() => {
            void loadShell();
            void loadEffectiveSettings(selectedLocationId);
          }}
          type="button"
          variant="outline"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
        {selectedLocationId ? (
          <Button disabled={locationLocked} onClick={clearSelection} type="button" variant="outline">
            <X className="h-4 w-4" />
            {canChangeStore ? "Global settings" : "Store locked"}
          </Button>
        ) : null}
      </div>

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

      <div className="grid gap-6 2xl:grid-cols-[430px_1fr]">
        <Card className="rounded-md shadow-none">
          <CardHeader className="border-b border-slate-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Store / location</CardTitle>
                <p className="mt-2 text-sm text-slate-500">
                  {selectedLocation
                    ? `Editing effective business settings for ${selectedLocation.name}.`
                    : "Global system settings are shown when no store is selected."}
                </p>
              </div>
              {locationLocked ? <ShieldCheck className="h-4 w-4 text-slate-400" /> : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-slate-100"
                disabled={locationLocked}
                onChange={(event) => {
                  setLocationQuery(event.target.value);
                  if (!locationLocked) {
                    setSelectedLocationId("");
                    setLocationSelectionSource("manual");
                  }
                }}
                placeholder="Search by store name, code, city, or address"
                value={locationQuery}
              />
            </div>

            <div className={cn("rounded-md border px-3 py-2 text-sm", selectedLocation ? "border-primary/30 bg-primary/5" : "border-slate-200 bg-slate-50")}>
              <p className="font-semibold text-slate-950">{selectedLocation?.name ?? effectiveSettings?.locationName ?? "Global"}</p>
              <p className="mt-1 truncate text-xs text-slate-500">
                {selectedLocation?.locationCode ?? selectedLocation?.id ?? "System defaults"}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {selectedLocation
                  ? locationLocked
                    ? "This store comes from the current user/location context."
                    : "Admin can switch stores or return to global settings."
                  : "No store selected. Saving updates the global/default system value."}
              </p>
            </div>

            <div className="max-h-72 space-y-1 overflow-y-auto">
              {filteredLocations.map((location) => {
                const isSelected = selectedLocationId === location.id;

                return (
                  <button
                    className={cn(
                      "block w-full rounded-md border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50",
                      isSelected && "border-primary/40 bg-primary/5",
                      locationLocked && !isSelected && "cursor-not-allowed opacity-70 hover:bg-white",
                    )}
                    disabled={locationLocked && !isSelected}
                    key={location.id ?? location.name}
                    onClick={() => selectLocation(location)}
                    type="button"
                  >
                    <span className="block font-semibold text-slate-950">{location.name}</span>
                    <span className="mt-1 block truncate text-xs text-slate-500">
                      {[location.locationCode, location.addressLine1, location.city].filter(Boolean).join(" / ")}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-slate-500">
              {canChangeStore
                ? "Role admin can switch stores or edit global defaults."
                : "Non-admin users edit settings only for their assigned/current store."}
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-md shadow-none">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-base">Business settings</CardTitle>
            <p className="mt-2 text-sm text-slate-500">
              {isGlobalMode
                ? "Backend returns global system settings when no store is selected."
                : "Backend returns system values merged with this store's overrides."}
            </p>
          </CardHeader>
          <CardContent className="space-y-5 p-5">
            {settingsStatus === "loading" || status === "loading" ? (
              <div className="rounded-md border border-slate-200 p-5 text-sm text-slate-500">Loading business settings...</div>
            ) : groupedSettings.length === 0 ? (
              <div className="rounded-md border border-slate-200 p-5 text-sm text-slate-500">No business settings returned.</div>
            ) : (
              groupedSettings.map(([group, settings]) => (
                <section className="overflow-hidden rounded-md border border-slate-200" key={group}>
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-100 px-4 py-3">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">{group}</h3>
                    <Badge className="border-slate-200 bg-white text-slate-700">{settings.length} settings</Badge>
                  </div>
                  <div className="divide-y divide-slate-200">
                    {settings.map((setting) => {
                      const draft = drafts[setting.settingKey];
                      const value = draft?.value ?? setting.effectiveValue ?? "";
                      const hasChanges = value.trim() !== (draft?.originalValue ?? setting.effectiveValue ?? "").trim();

                      return (
                        <div className="grid gap-4 px-4 py-4 xl:grid-cols-[260px_1fr_220px_190px]" key={setting.settingKey}>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-950">{getSettingLabel(setting)}</p>
                            <p className="mt-1 truncate font-mono text-xs text-slate-500">{setting.settingKey}</p>
                            <div className="mt-2">
                              <Badge className={cn("rounded-md", setting.source === "LOCATION" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800")}>
                                {setting.source}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-sm text-slate-600">
                            <p>{setting.description || "No description provided."}</p>
                            {setting.unit ? <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">Unit: {setting.unit}</p> : null}
                            <p className="mt-2 text-xs text-slate-500">
                              System: {formatSettingValue(setting.systemValue)}
                              {selectedLocationId ? ` / Location: ${formatSettingValue(setting.locationValue)}` : null}
                            </p>
                          </div>
                          <div>
                            <SettingInput
                              disabled={savingKey === setting.settingKey || resettingKey === setting.settingKey}
                              onChange={(nextValue) => updateDraft(setting.settingKey, nextValue)}
                              setting={setting}
                              value={value}
                            />
                            <p className="mt-1 text-xs text-slate-500">Effective value from backend: {formatSettingValue(setting.effectiveValue)}</p>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button
                              disabled={!hasChanges || savingKey === setting.settingKey || resettingKey === setting.settingKey}
                              onClick={() => void saveSetting(setting)}
                              size="sm"
                              type="button"
                            >
                              <Save className="h-4 w-4" />
                              {savingKey === setting.settingKey ? "Saving..." : "Save"}
                            </Button>
                            {selectedLocationId ? (
                              <Button
                                disabled={setting.source !== "LOCATION" || resettingKey === setting.settingKey || savingKey === setting.settingKey}
                                onClick={() => void resetSetting(setting)}
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                <Trash2 className="h-4 w-4" />
                                {resettingKey === setting.settingKey ? "Resetting..." : "Reset to system"}
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SettingInput({
  disabled,
  onChange,
  setting,
  value,
}: {
  disabled?: boolean;
  onChange: (value: string) => void;
  setting: BusinessSetting;
  value: string;
}) {
  const isNumber = NUMBER_KEYS.has(setting.settingKey);

  return (
    <input
      className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-slate-100"
      disabled={disabled}
      inputMode={isNumber ? "decimal" : "text"}
      onChange={(event) => onChange(event.target.value)}
      step={isNumber ? "0.01" : undefined}
      type={isNumber ? "number" : "text"}
      value={value}
    />
  );
}

function getSettingLabel(setting: BusinessSetting) {
  return setting.label || FALLBACK_LABELS[setting.settingKey] || setting.settingKey;
}

function formatSettingValue(value: string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "Not set";
  }

  return value;
}

function getStoredLocationContext() {
  return {
    locationId:
      sessionStorage.getItem("umika_location_id") ??
      sessionStorage.getItem("location_id") ??
      localStorage.getItem("umika_location_id") ??
      localStorage.getItem("location_id"),
    locationCode: sessionStorage.getItem("umika_location_code") ?? localStorage.getItem("umika_location_code"),
  };
}

function getAuthHeaders() {
  const token = localStorage.getItem("umika_access_token");
  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function getManagerErrorMessage(status: number | undefined, body: unknown, fallback: string) {
  if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
    return body.message;
  }

  if (status === 403) {
    return "Your account is logged in, but it does not have permission to manage store settings.";
  }

  return fallback;
}
