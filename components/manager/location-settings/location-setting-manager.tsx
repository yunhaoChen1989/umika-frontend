"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, RefreshCw, Save, Search, ShieldCheck, Trash2, X } from "lucide-react";

import { LoginRedirectLink } from "@/components/auth/login-redirect-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LocationDto, SpringPage } from "@/lib/location-types";
import type { LocationSettingDto } from "@/lib/location-setting-types";
import type { SystemSettingDto } from "@/lib/system-setting-types";
import { cn } from "@/lib/utils";

type CurrentAccountProfile = {
  role?: string | null;
  roles?: string[] | null;
};

type LocationSettingWireDto = Partial<LocationSettingDto> & {
  location_id?: string | null;
  setting_group?: string | null;
  setting_key?: string | null;
  setting_value?: string | null;
  description?: string | null;
};

type SystemSettingWireDto = Partial<SystemSettingDto> & {
  setting_group?: string | null;
  setting_key?: string | null;
  setting_value?: string | null;
  description?: string | null;
};

type SettingDefinition = {
  key: string;
  label: string;
  description: string;
  kind: "number" | "text";
  step?: string;
  placeholder?: string;
};

const SETTING_GROUP = "GENERAL";
const STORE_CHANGE_ROLES = new Set(["ROLE_ADMIN", "ADMIN"]);

const SETTING_DEFINITIONS: SettingDefinition[] = [
  {
    key: "DEFAULT_TAX_RATE",
    label: "Tax rate",
    description: "Ontario HST percentage.",
    kind: "number",
    step: "0.01",
  },
  {
    key: "POINTS_PER_DOLLAR",
    label: "Points per dollar",
    description: "Points earned per dollar spent.",
    kind: "number",
    step: "1",
  },
  {
    key: "POINT_VALUE_CENTS",
    label: "Point value",
    description: "Each point equals this many cents when redeemed.",
    kind: "number",
    step: "1",
  },
  {
    key: "BIRTHDAY_BONUS_POINTS",
    label: "Birthday bonus points",
    description: "Birthday reward points.",
    kind: "number",
    step: "1",
  },
  {
    key: "REFERRAL_SIGNUP_POINTS",
    label: "Referral signup points",
    description: "Points awarded when a referred user registers.",
    kind: "number",
    step: "1",
  },
  {
    key: "REFERRAL_FIRST_ORDER_POINTS",
    label: "Referral first order points",
    description: "Points awarded when a referred user places the first qualifying order.",
    kind: "number",
    step: "1",
  },
  {
    key: "MIN_REFERRAL_ORDER_AMOUNT",
    label: "Minimum referral order amount",
    description: "Minimum order amount to trigger referral reward.",
    kind: "number",
    step: "0.01",
  },
  {
    key: "MAX_REDEMPTION_PERCENT",
    label: "Maximum redemption percent",
    description: "Maximum percentage of an order that can be paid with points.",
    kind: "number",
    step: "1",
  },
  {
    key: "DEFAULT_CURRENCY",
    label: "Default currency",
    description: "System currency code.",
    kind: "text",
    placeholder: "CAD",
  },
];

type SettingRow = {
  definition: SettingDefinition;
  globalSetting: SystemSettingDto | null;
  overrideSetting: LocationSettingDto | null;
  draftValue: string;
  effectiveValue: string;
  hasChanges: boolean;
  inherited: boolean;
};

export function LocationSettingManager() {
  const [locations, setLocations] = useState<LocationDto[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettingDto[]>([]);
  const [locationSettings, setLocationSettings] = useState<LocationSettingDto[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [locationSelectionSource, setLocationSelectionSource] = useState<"stored" | "manual" | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"loading" | "ready" | "unauthenticated" | "error">("loading");
  const [overrideStatus, setOverrideStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [canChangeStore, setCanChangeStore] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const locationById = useMemo(() => new Map(locations.map((location) => [location.id, location])), [locations]);
  const globalSettingsByKey = useMemo(() => new Map(systemSettings.map((setting) => [setting.settingKey, setting])), [systemSettings]);
  const locationSettingsByKey = useMemo(() => new Map(locationSettings.map((setting) => [setting.settingKey, setting])), [locationSettings]);
  const selectedLocation = selectedLocationId ? locationById.get(selectedLocationId) ?? null : null;
  const locationLocked = Boolean(selectedLocationId) && !canChangeStore;

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

  const settingRows = useMemo<SettingRow[]>(
    () =>
      SETTING_DEFINITIONS.map((definition) => {
        const globalSetting = globalSettingsByKey.get(definition.key) ?? null;
        const overrideSetting = locationSettingsByKey.get(definition.key) ?? null;
        const draftValue = draftValues[definition.key] ?? overrideSetting?.settingValue ?? globalSetting?.settingValue ?? "";
        const effectiveValue = overrideSetting?.settingValue ?? globalSetting?.settingValue ?? "";

        return {
          definition,
          globalSetting,
          overrideSetting,
          draftValue,
          effectiveValue,
          hasChanges: draftValue.trim() !== (overrideSetting?.settingValue ?? globalSetting?.settingValue ?? "").trim(),
          inherited: !overrideSetting || overrideSetting.settingValue === null || overrideSetting.settingValue === "",
        };
      }),
    [draftValues, globalSettingsByKey, locationSettingsByKey],
  );
  const isOverridesLoading = overrideStatus === "loading";

  const loadCatalog = useCallback(async () => {
    setStatus("loading");
    setError(null);

    const profileResponse = await fetch("/api/me/profile", {
      method: "GET",
      headers: getAuthHeaders(),
      cache: "no-store",
    }).catch(() => null);

    if (profileResponse?.ok) {
      const profile = (await profileResponse.json().catch(() => null)) as CurrentAccountProfile | null;
      const roles = [...(profile?.roles ?? []), profile?.role]
        .filter((role): role is string => Boolean(role))
        .map((role) => role.toUpperCase());
      setCanChangeStore(roles.some((role) => STORE_CHANGE_ROLES.has(role)));
    } else {
      setCanChangeStore(false);
    }

    const headers = getAuthHeaders();
    const [locationsResponse, systemSettingsResponse] = await Promise.all([
      fetch("/api/manager/locations?page=0&size=300&sort=name,asc", { headers, cache: "no-store" }).catch(() => null),
      fetch("/api/manager/system-settings?page=0&size=200&sort=settingKey,asc", { headers, cache: "no-store" }).catch(() => null),
    ]);
    const failed = [locationsResponse, systemSettingsResponse].find((response) => !response?.ok);

    if (failed) {
      const body = await failed?.json().catch(() => null);
      setStatus(failed?.status === 401 ? "unauthenticated" : "error");
      setError(getManagerErrorMessage(failed?.status, body, "Unable to load system settings."));
      return;
    }

    const locationsPage = (await locationsResponse!.json()) as SpringPage<LocationDto>;
    const systemSettingsPage = (await systemSettingsResponse!.json()) as SpringPage<SystemSettingWireDto>;

    setLocations(locationsPage.content ?? []);
    setSystemSettings(
      (systemSettingsPage.content ?? [])
        .map(normalizeSystemSetting)
        .filter((item): item is SystemSettingDto => Boolean(item))
        .filter((setting) => SETTING_DEFINITIONS.some((definition) => definition.key === setting.settingKey)),
    );
    setStatus("ready");
  }, []);

  const loadOverrides = useCallback(
    async (locationId: string) => {
      if (!locationId) {
        setLocationSettings([]);
        setDraftValues({});
        setOverrideStatus("idle");
        return;
      }

      setOverrideStatus("loading");
      setError(null);

      const headers = getAuthHeaders();
      const url = new URL("/api/manager/location-settings", window.location.origin);
      url.searchParams.set("page", "0");
      url.searchParams.set("size", "200");
      url.searchParams.set("sort", "settingKey,asc");
      url.searchParams.set("locationId", locationId);
      url.searchParams.set("settingGroup", SETTING_GROUP);

      const response = await fetch(url.toString(), { headers, cache: "no-store" }).catch(() => null);

      if (!response?.ok) {
        const body = response ? await response.json().catch(() => null) : null;
        setOverrideStatus(response?.status === 401 ? "error" : "error");
        setError(getManagerErrorMessage(response?.status, body, "Unable to load store overrides."));
        return;
      }

      const page = (await response.json()) as SpringPage<LocationSettingWireDto>;
      const overrides = (page.content ?? []).map(normalizeLocationSetting).filter((item): item is LocationSettingDto => Boolean(item));

      setLocationSettings(overrides);
      setDraftValues(buildDraftValues(overrides, systemSettings));
      setOverrideStatus("ready");
    },
    [systemSettings],
  );

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (locationSelectionSource !== null || selectedLocationId || locations.length === 0) {
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
  }, [locationSelectionSource, locations, selectedLocationId]);

  useEffect(() => {
    if (!selectedLocationId || status !== "ready") {
      return;
    }

    void loadOverrides(selectedLocationId);
  }, [loadOverrides, selectedLocationId, status]);

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
    setLocationSelectionSource(null);
    setLocationSettings([]);
    setDraftValues({});
    setMessage(null);
    setError(null);
  }

  function updateDraft(key: string, value: string) {
    setDraftValues((current) => ({ ...current, [key]: value }));
  }

  async function saveOverride(definition: SettingDefinition) {
    if (!selectedLocationId) {
      setError("Select a store first.");
      return;
    }

    const draftValue = (draftValues[definition.key] ?? "").trim();
    const globalValue = (globalSettingsByKey.get(definition.key)?.settingValue ?? "").trim();
    const existing = locationSettingsByKey.get(definition.key) ?? null;

    if (!draftValue || draftValue === globalValue) {
      if (existing?.id) {
        await deleteOverride(definition, false);
      } else {
        setMessage(`${definition.label} already matches the global value.`);
      }
      return;
    }

    setSavingKey(definition.key);
    setMessage(null);
    setError(null);

    const payload: LocationSettingDto = {
      id: existing?.id ?? null,
      locationId: selectedLocationId,
      settingGroup: SETTING_GROUP,
      settingKey: definition.key,
      settingValue: draftValue,
      description: definition.description,
    };

    const response = await fetch(existing?.id ? `/api/manager/location-settings/${existing.id}` : "/api/manager/location-settings", {
      method: existing?.id ? "PUT" : "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }).catch(() => null);

    setSavingKey(null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setError(getManagerErrorMessage(response?.status, body, "Unable to save the override."));
      return;
    }

    setMessage(`${definition.label} override saved.`);
    await loadOverrides(selectedLocationId);
  }

  async function deleteOverride(definition: SettingDefinition, showMessage = true) {
    const existing = locationSettingsByKey.get(definition.key);

    if (!existing?.id) {
      updateDraft(definition.key, "");
      return;
    }

    setDeletingKey(definition.key);
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/manager/location-settings/${existing.id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    }).catch(() => null);

    setDeletingKey(null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setError(getManagerErrorMessage(response?.status, body, "Unable to delete the override."));
      return;
    }

    updateDraft(definition.key, globalSettingsByKey.get(definition.key)?.settingValue ?? "");

    if (showMessage) {
      setMessage(`${definition.label} reset to the global value.`);
    }

    await loadOverrides(selectedLocationId);
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
        <Button disabled={status === "loading"} onClick={() => void loadCatalog()} type="button" variant="outline">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
        {selectedLocationId ? (
          <Button disabled={locationLocked} onClick={clearSelection} type="button" variant="outline">
            <X className="h-4 w-4" />
            Change store
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
                    ? `Managing overrides for ${selectedLocation.name}.`
                    : "Select a store to view and override its inherited settings."}
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

            {selectedLocation ? (
              <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                <p className="font-semibold text-slate-950">{selectedLocation.name}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{selectedLocation.locationCode ?? selectedLocation.id}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {locationLocked ? "This store is locked from the URL context." : "This store can be changed before editing overrides."}
                </p>
              </div>
            ) : null}

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
              {canChangeStore ? "Role admin can switch stores freely." : "Non-admin users can edit overrides on the current store, but changing the store is restricted once set."}
            </p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="overflow-hidden rounded-md shadow-none">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-base">Global settings</CardTitle>
              <p className="mt-2 text-sm text-slate-500">Values from `system_settings` that location overrides inherit from.</p>
            </CardHeader>
            <CardContent className="p-0">
              {status === "loading" ? (
                <div className="p-5 text-sm text-slate-500">Loading global settings...</div>
              ) : SETTING_DEFINITIONS.length === 0 ? (
                <div className="p-5 text-sm text-slate-500">No settings configured.</div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="grid min-w-[920px] grid-cols-[220px_1fr_180px] border-b border-slate-200 bg-slate-100 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <span>Key</span>
                    <span>Description</span>
                    <span>Value</span>
                  </div>
                  {SETTING_DEFINITIONS.map((definition) => {
                    const setting = globalSettingsByKey.get(definition.key);

                    return (
                      <div className="grid min-w-[920px] grid-cols-[220px_1fr_180px] items-center border-b border-slate-200 px-5 py-4 last:border-b-0" key={definition.key}>
                        <div className="min-w-0">
                          <p className="truncate font-mono text-sm font-semibold text-slate-950">{definition.key}</p>
                          <p className="mt-1 text-xs text-slate-500">{definition.label}</p>
                        </div>
                        <p className="text-sm text-slate-600">{setting?.description ?? definition.description}</p>
                        <div className="flex items-center justify-end gap-2">
                          <Badge className="rounded-md bg-slate-100 text-slate-700">{formatSettingValue(setting?.settingValue)}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-md shadow-none">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-base">Store overrides</CardTitle>
              <p className="mt-2 text-sm text-slate-500">
                {selectedLocation
                  ? "Edit only the fields you want to override. Clearing a value resets it back to the global default."
                  : "Pick a store to edit its overrides."}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {!selectedLocation ? (
                <div className="p-5 text-sm text-slate-500">No store selected.</div>
              ) : isOverridesLoading ? (
                <div className="p-5 text-sm text-slate-500">Loading store overrides...</div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="grid min-w-[1280px] grid-cols-[220px_1fr_220px_220px_150px_170px] border-b border-slate-200 bg-slate-100 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <span>Setting</span>
                    <span>Description</span>
                    <span>Global</span>
                    <span>Store override</span>
                    <span>Effective</span>
                    <span>Actions</span>
                  </div>
                  {settingRows.map((row) => (
                    <div
                      className="grid min-w-[1280px] grid-cols-[220px_1fr_220px_220px_150px_170px] items-start gap-3 border-b border-slate-200 px-5 py-4 last:border-b-0"
                      key={row.definition.key}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm font-semibold text-slate-950">{row.definition.key}</p>
                        <p className="mt-1 text-xs text-slate-500">{row.definition.label}</p>
                      </div>
                      <p className="text-sm text-slate-600">{row.definition.description}</p>
                      <div className="pt-1">
                        <Badge className="rounded-md bg-slate-100 text-slate-700">{formatSettingValue(row.globalSetting?.settingValue)}</Badge>
                      </div>
                      <div>
                        <SettingInput
                          definition={row.definition}
                          disabled={isOverridesLoading}
                          onChange={(value) => updateDraft(row.definition.key, value)}
                          placeholder={row.definition.placeholder ?? row.globalSetting?.settingValue ?? ""}
                          value={row.draftValue}
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          {row.overrideSetting ? `Saved override: ${formatSettingValue(row.overrideSetting.settingValue)}` : "No saved override yet."}
                        </p>
                      </div>
                      <div className="pt-1">
                        <Badge className={cn("rounded-md", row.inherited ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800")}>
                          {row.inherited ? "Inherited" : "Override"}
                        </Badge>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{row.draftValue.trim() || row.globalSetting?.settingValue || "Not set"}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          disabled={isOverridesLoading || savingKey === row.definition.key}
                          onClick={() => void saveOverride(row.definition)}
                          size="sm"
                          type="button"
                        >
                          <Save className="h-4 w-4" />
                          {savingKey === row.definition.key ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          disabled={isOverridesLoading || deletingKey === row.definition.key || !row.overrideSetting?.id}
                          onClick={() => void deleteOverride(row.definition)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <Trash2 className="h-4 w-4" />
                          {deletingKey === row.definition.key ? "Resetting..." : "Reset"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function buildDraftValues(overrides: LocationSettingDto[], systemSettings: SystemSettingDto[]) {
  const drafts: Record<string, string> = {};
  const overrideByKey = new Map(overrides.map((setting) => [setting.settingKey, setting.settingValue ?? ""]));
  const systemByKey = new Map(systemSettings.map((setting) => [setting.settingKey, setting.settingValue ?? ""]));

  for (const definition of SETTING_DEFINITIONS) {
    drafts[definition.key] = overrideByKey.get(definition.key) ?? systemByKey.get(definition.key) ?? "";
  }

  return drafts;
}

function normalizeLocationSetting(setting: LocationSettingWireDto): LocationSettingDto | null {
  const locationId = setting.locationId ?? setting.location_id;
  const settingKey = setting.settingKey ?? setting.setting_key;

  if (!locationId || !settingKey) {
    return null;
  }

  return {
    id: setting.id ?? null,
    locationId,
    settingGroup: setting.settingGroup ?? setting.setting_group ?? SETTING_GROUP,
    settingKey,
    settingValue: setting.settingValue ?? setting.setting_value ?? null,
    description: setting.description ?? null,
    createdAt: setting.createdAt ?? null,
    updatedAt: setting.updatedAt ?? null,
  };
}

function normalizeSystemSetting(setting: SystemSettingWireDto): SystemSettingDto | null {
  const settingKey = setting.settingKey ?? setting.setting_key;

  if (!settingKey) {
    return null;
  }

  return {
    id: setting.id ?? null,
    settingGroup: setting.settingGroup ?? setting.setting_group ?? SETTING_GROUP,
    settingKey,
    settingValue: setting.settingValue ?? setting.setting_value ?? null,
    description: setting.description ?? null,
    createdAt: setting.createdAt ?? null,
    updatedAt: setting.updatedAt ?? null,
  };
}

function formatSettingValue(value: string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "Global default";
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

function SettingInput({
  definition,
  disabled,
  onChange,
  placeholder,
  value,
}: {
  definition: SettingDefinition;
  disabled?: boolean;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <input
      className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-slate-100"
      disabled={disabled}
      inputMode={definition.kind === "number" ? "decimal" : "text"}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      step={definition.step}
      type={definition.kind === "number" ? "number" : "text"}
      value={value}
    />
  );
}
