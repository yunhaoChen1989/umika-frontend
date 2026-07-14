"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { AlertCircle, CheckCircle2, Clock3, Copy, ExternalLink, Pencil, Plus, RefreshCw, Store, Trash2, X } from "lucide-react";

import { LoginRedirectLink } from "@/components/auth/login-redirect-link";
import { StatusPill } from "@/components/manager/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { LocationDto, SpringPage } from "@/lib/location-types";

type LocationFormState = {
  id: string;
  name: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  isActive: boolean;
};

type BusinessHour = {
  id?: string | null;
  locationId?: string | null;
  dayOfWeek: number;
  openTime?: string | null;
  closeTime?: string | null;
  isClosed?: boolean | null;
};

type BusinessHourForm = {
  id: string;
  dayOfWeek: string;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
};

const emptyForm: LocationFormState = {
  id: "",
  name: "",
  phone: "",
  email: "",
  addressLine1: "",
  addressLine2: "",
  city: "Toronto",
  province: "ON",
  postalCode: "",
  country: "Canada",
  isActive: true,
};

const emptyHourForm: BusinessHourForm = {
  id: "",
  dayOfWeek: "1",
  openTime: "11:00",
  closeTime: "21:00",
  isClosed: false,
};

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function LocationManager() {
  const [locations, setLocations] = useState<LocationDto[]>([]);
  const [form, setForm] = useState<LocationFormState>(emptyForm);
  const [status, setStatus] = useState<"loading" | "ready" | "unauthenticated" | "error">("loading");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [publicOrigin, setPublicOrigin] = useState("");
  const [hoursDialogLocation, setHoursDialogLocation] = useState<LocationDto | null>(null);
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
  const [hourForm, setHourForm] = useState<BusinessHourForm>(emptyHourForm);
  const [hoursStatus, setHoursStatus] = useState<"idle" | "loading" | "saving">("idle");
  const [hoursMessage, setHoursMessage] = useState<string | null>(null);
  const [hoursError, setHoursError] = useState<string | null>(null);

  const isEditing = Boolean(form.id);
  const isEditingHour = Boolean(hourForm.id);

  const loadLocations = useCallback(async () => {
    const currentToken = localStorage.getItem("umika_access_token");

    if (!currentToken) {
      setStatus("unauthenticated");
      return;
    }

    setStatus("loading");
    setError(null);

    const response = await fetch("/api/manager/locations?page=0&size=100&sort=name,asc", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${currentToken}`,
      },
      cache: "no-store",
    }).catch(() => null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setStatus(response?.status === 401 || response?.status === 403 ? "unauthenticated" : "error");
      setError(typeof body?.message === "string" ? body.message : "Unable to load locations.");
      return;
    }

    const page = (await response.json()) as SpringPage<LocationDto>;
    setLocations(page.content ?? []);
    setStatus("ready");
  }, []);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    setPublicOrigin(window.location.origin);
  }, []);

  function updateField<K extends keyof LocationFormState>(key: K, value: LocationFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function selectLocation(location: LocationDto) {
    setMessage(null);
    setError(null);
    setIsFormVisible(true);
    setForm({
      id: location.id ?? "",
      name: location.name ?? "",
      phone: location.phone ?? "",
      email: location.email ?? "",
      addressLine1: location.addressLine1 ?? "",
      addressLine2: location.addressLine2 ?? "",
      city: location.city ?? "",
      province: location.province ?? "",
      postalCode: location.postalCode ?? "",
      country: location.country ?? "",
      isActive: location.isActive ?? true,
    });
  }

  function resetForm() {
    setForm(emptyForm);
    setMessage(null);
    setError(null);
  }

  function startCreate() {
    setForm(emptyForm);
    setMessage(null);
    setError(null);
    setIsFormVisible(true);
  }

  function closeForm() {
    resetForm();
    setIsFormVisible(false);
  }

  async function saveLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const currentToken = localStorage.getItem("umika_access_token");

    if (!currentToken) {
      setStatus("unauthenticated");
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setError(null);

    const payload: LocationDto = {
      id: form.id || null,
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      addressLine1: form.addressLine1.trim(),
      addressLine2: form.addressLine2.trim() || null,
      city: form.city.trim(),
      province: form.province.trim(),
      postalCode: form.postalCode.trim(),
      country: form.country.trim() || null,
      isActive: form.isActive,
      createdAt: null,
      updatedAt: null,
    };

    const response = await fetch(form.id ? `/api/manager/locations/${form.id}` : "/api/manager/locations", {
      method: form.id ? "PUT" : "POST",
      headers: {
        Authorization: `Bearer ${currentToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }).catch(() => null);

    setIsSaving(false);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setError(typeof body?.message === "string" ? body.message : "Unable to save location.");
      return;
    }

    setMessage(form.id ? "Location updated." : "Location created.");
    resetForm();
    setIsFormVisible(false);
    await loadLocations();
  }

  async function deleteLocation(location: LocationDto) {
    if (!location.id) {
      return;
    }

    const currentToken = localStorage.getItem("umika_access_token");

    if (!currentToken) {
      setStatus("unauthenticated");
      return;
    }

    const confirmed = window.confirm(`Delete ${location.name}?`);

    if (!confirmed) {
      return;
    }

    setDeletingId(location.id);
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/manager/locations/${location.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${currentToken}`,
      },
    }).catch(() => null);

    setDeletingId(null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setError(typeof body?.message === "string" ? body.message : "Unable to delete location.");
      return;
    }

    if (form.id === location.id) {
      resetForm();
    }

    setMessage("Location deleted.");
    await loadLocations();
  }

  async function toggleActive(location: LocationDto) {
    if (!location.id) {
      return;
    }

    const currentToken = localStorage.getItem("umika_access_token");

    if (!currentToken) {
      setStatus("unauthenticated");
      return;
    }

    setError(null);
    setMessage(null);

    const response = await fetch(`/api/manager/locations/${location.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${currentToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...location,
        isActive: !(location.isActive ?? true),
      }),
    }).catch(() => null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setError(typeof body?.message === "string" ? body.message : "Unable to update location status.");
      return;
    }

    setMessage("Location status updated.");
    await loadLocations();
  }

  async function copyLocationUrl(location: LocationDto) {
    const url = getLocationUrl(location, publicOrigin);

    if (!url) {
      return;
    }

    await navigator.clipboard.writeText(url).catch(() => null);
    setMessage("Location URL copied.");
    setError(null);
  }

  async function openHoursDialog(location: LocationDto) {
    setHoursDialogLocation(location);
    setHourForm({ ...emptyHourForm, dayOfWeek: getNextAvailableDay([]) });
    setBusinessHours([]);
    setHoursMessage(null);
    setHoursError(null);
    await loadBusinessHours(location);
  }

  async function loadBusinessHours(location = hoursDialogLocation) {
    if (!location?.id) {
      return;
    }

    setHoursStatus("loading");
    setHoursError(null);

    const url = new URL("/api/business-hours", window.location.origin);
    url.searchParams.set("locationId", location.id);

    const response = await fetch(url.toString(), {
      headers: getAuthHeaders(),
      cache: "no-store",
    }).catch(() => null);

    setHoursStatus("idle");

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setBusinessHours([]);
      setHoursError(getApiErrorMessage(body, "Unable to load store hours."));
      return;
    }

    const body = (await response.json().catch(() => null)) as SpringPage<BusinessHour> | BusinessHour[] | null;
    const hours = Array.isArray(body) ? body : body?.content ?? [];
    setBusinessHours(hours.sort((a, b) => a.dayOfWeek - b.dayOfWeek));
    setHourForm((current) => current.id ? current : { ...current, dayOfWeek: getNextAvailableDay(hours) });
  }

  function editBusinessHour(hour: BusinessHour) {
    setHourForm({
      id: hour.id ?? "",
      dayOfWeek: String(hour.dayOfWeek),
      openTime: toTimeInput(hour.openTime),
      closeTime: toTimeInput(hour.closeTime),
      isClosed: hour.isClosed === true,
    });
    setHoursMessage(null);
    setHoursError(null);
  }

  function clearHourForm() {
    setHourForm({ ...emptyHourForm, dayOfWeek: getNextAvailableDay(businessHours) });
    setHoursMessage(null);
    setHoursError(null);
  }

  async function saveBusinessHour(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hoursDialogLocation?.id) {
      return;
    }

    const dayOfWeek = Number(hourForm.dayOfWeek);
    const payload = {
      locationId: hoursDialogLocation.id,
      dayOfWeek,
      openTime: hourForm.isClosed ? null : hourForm.openTime,
      closeTime: hourForm.isClosed ? null : hourForm.closeTime,
      isClosed: hourForm.isClosed,
    };

    setHoursStatus("saving");
    setHoursMessage(null);
    setHoursError(null);

    const response = await fetch(hourForm.id ? `/api/manager/business-hours/${encodeURIComponent(hourForm.id)}` : "/api/manager/business-hours", {
      method: hourForm.id ? "PUT" : "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    }).catch(() => null);

    setHoursStatus("idle");

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setHoursError(getApiErrorMessage(body, "Unable to save store hours."));
      return;
    }

    setHoursMessage(hourForm.id ? "Store hours updated." : "Store hours added.");
    clearHourForm();
    await loadBusinessHours(hoursDialogLocation);
  }

  async function deleteBusinessHour(hour: BusinessHour) {
    if (!hour.id || !hoursDialogLocation) {
      return;
    }

    const confirmed = window.confirm(`Delete hours for ${dayNames[hour.dayOfWeek] ?? "this day"}?`);
    if (!confirmed) {
      return;
    }

    setHoursStatus("saving");
    setHoursMessage(null);
    setHoursError(null);

    const response = await fetch(`/api/manager/business-hours/${encodeURIComponent(hour.id)}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
      cache: "no-store",
    }).catch(() => null);

    setHoursStatus("idle");

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setHoursError(getApiErrorMessage(body, "Unable to delete store hours."));
      return;
    }

    setHoursMessage("Store hours deleted.");
    if (hourForm.id === hour.id) {
      clearHourForm();
    }
    await loadBusinessHours(hoursDialogLocation);
  }

  if (status === "unauthenticated") {
    return (
      <Card className="rounded-md shadow-none">
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">{error ?? "Log in with a manager account to manage locations."}</p>
          <Button asChild className="w-full sm:w-auto">
            <LoginRedirectLink>Login</LoginRedirectLink>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={startCreate} type="button">
          <Plus className="h-4 w-4" />
          Add location
        </Button>
      </div>

      <div className={isFormVisible ? "grid gap-6 xl:grid-cols-[420px_1fr]" : "grid gap-6"}>
        {isFormVisible ? (
          <Card className="rounded-md shadow-none">
            <CardHeader className="border-b border-slate-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{isEditing ? "Edit location" : "Add location"}</CardTitle>
                  <p className="mt-2 text-sm text-slate-500">Required fields match the backend locations table.</p>
                </div>
                <Button onClick={closeForm} size="icon" type="button" variant="outline" aria-label="Close location form">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" id="location-form" onSubmit={(event) => void saveLocation(event)}>
            <Field label="Store name" required>
              <input
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                onChange={(event) => updateField("name", event.target.value)}
                required
                value={form.name}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <Field label="Phone">
                <input
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  onChange={(event) => updateField("phone", event.target.value)}
                  value={form.phone}
                />
              </Field>
              <Field label="Email">
                <input
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  onChange={(event) => updateField("email", event.target.value)}
                  type="email"
                  value={form.email}
                />
              </Field>
            </div>
            <Field label="Address line 1" required>
              <input
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                onChange={(event) => updateField("addressLine1", event.target.value)}
                required
                value={form.addressLine1}
              />
            </Field>
            <Field label="Address line 2">
              <input
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                onChange={(event) => updateField("addressLine2", event.target.value)}
                value={form.addressLine2}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="City" required>
                <input
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  onChange={(event) => updateField("city", event.target.value)}
                  required
                  value={form.city}
                />
              </Field>
              <Field label="Province" required>
                <input
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  onChange={(event) => updateField("province", event.target.value)}
                  required
                  value={form.province}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Postal code" required>
                <input
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm uppercase outline-none focus:ring-2 focus:ring-ring"
                  onChange={(event) => updateField("postalCode", event.target.value)}
                  required
                  value={form.postalCode}
                />
              </Field>
              <Field label="Country">
                <input
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  onChange={(event) => updateField("country", event.target.value)}
                  value={form.country}
                />
              </Field>
            </div>
            <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
              <input
                checked={form.isActive}
                className="h-4 w-4 accent-primary"
                onChange={(event) => updateField("isActive", event.target.checked)}
                type="checkbox"
              />
              Active location
            </label>
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
                <div className="flex gap-2">
                  <Button className="flex-1" disabled={isSaving} type="submit">
                    {isEditing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {isSaving ? "Saving..." : isEditing ? "Update location" : "Create location"}
                  </Button>
                  <Button onClick={resetForm} type="button" variant="outline">
                    Clear
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}

      <Card className="overflow-hidden rounded-md shadow-none">
        <CardHeader className="border-b border-slate-200">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <CardTitle className="text-base">Store locations</CardTitle>
              <p className="mt-2 text-sm text-slate-500">{locations.length} locations loaded from backend.</p>
            </div>
            <Button disabled={status === "loading"} onClick={() => void loadLocations()} type="button" variant="outline">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {status === "loading" ? (
            <div className="p-5 text-sm text-slate-500">Loading locations...</div>
          ) : locations.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">No locations yet. Add the first store with the form.</div>
          ) : (
            <div className="overflow-x-auto">
              <div className="grid min-w-[1120px] grid-cols-[1.2fr_1.4fr_1.7fr_150px_150px_220px] border-b border-slate-200 bg-slate-100 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                <span>Store</span>
                <span>Address</span>
                <span>Public URL</span>
                <span>Contact</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {locations.map((location) => {
                const locationUrl = getLocationUrl(location, publicOrigin);

                return (
                  <div
                    className="grid min-w-[1120px] grid-cols-[1.2fr_1.4fr_1.7fr_150px_150px_220px] items-center border-b border-slate-200 px-5 py-4 last:border-b-0"
                    key={location.id ?? location.name}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">{location.name}</p>
                      <p className="mt-1 truncate font-mono text-xs text-slate-500">{location.id}</p>
                    </div>
                    <div className="min-w-0 text-sm text-slate-600">
                      <p className="truncate">{location.addressLine1}</p>
                      <p className="truncate">
                        {[location.city, location.province, location.postalCode].filter(Boolean).join(", ")}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-semibold text-slate-700">{location.locationCode ?? "No code yet"}</p>
                      {locationUrl ? (
                        <a
                          className="mt-1 block truncate font-mono text-xs text-primary hover:underline"
                          href={locationUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {locationUrl}
                        </a>
                      ) : (
                        <p className="mt-1 text-xs text-slate-500">Save or refresh after backend generates a code.</p>
                      )}
                    </div>
                    <div className="min-w-0 text-sm text-slate-600">
                      <p className="truncate">{location.phone ?? "No phone"}</p>
                      <p className="truncate">{location.email ?? "No email"}</p>
                    </div>
                    <StatusPill tone={location.isActive === false ? "DISABLED" : "ACTIVE"}>
                      {location.isActive === false ? "INACTIVE" : "ACTIVE"}
                    </StatusPill>
                    <div className="flex items-center gap-2">
                      <Button
                        disabled={!locationUrl}
                        onClick={() => void copyLocationUrl(location)}
                        size="icon"
                        type="button"
                        variant="outline"
                        aria-label={`Copy public URL for ${location.name}`}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button asChild disabled={!locationUrl} size="icon" type="button" variant="outline" aria-label={`Open public URL for ${location.name}`}>
                        <a href={locationUrl || "#"} rel="noreferrer" target="_blank">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button onClick={() => void openHoursDialog(location)} size="icon" type="button" variant="outline" aria-label={`Edit hours for ${location.name}`}>
                        <Clock3 className="h-4 w-4" />
                      </Button>
                      <Button onClick={() => selectLocation(location)} size="icon" type="button" variant="outline" aria-label={`Edit ${location.name}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button onClick={() => void toggleActive(location)} size="icon" type="button" variant="outline" aria-label={`Toggle ${location.name}`}>
                        <Store className="h-4 w-4" />
                      </Button>
                      <Button
                        disabled={deletingId === location.id}
                        onClick={() => void deleteLocation(location)}
                        size="icon"
                        type="button"
                        variant="outline"
                        aria-label={`Delete ${location.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
      <Dialog
        open={Boolean(hoursDialogLocation)}
        onOpenChange={(open) => {
          if (!open) {
            setHoursDialogLocation(null);
            setBusinessHours([]);
            setHourForm(emptyHourForm);
            setHoursMessage(null);
            setHoursError(null);
          }
        }}
      >
        <DialogContent className="w-[min(96vw,58rem)]">
          <DialogHeader>
            <DialogTitle>{hoursDialogLocation ? `Store hours: ${hoursDialogLocation.name}` : "Store hours"}</DialogTitle>
            <DialogDescription>Add, edit, or remove weekly business hours. Backend enforces one row per day and permission scope.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 p-5 xl:grid-cols-[1fr_320px]">
            <div className="rounded-md border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-100 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                Weekly hours
              </div>
              {hoursStatus === "loading" ? <div className="p-4 text-sm text-slate-500">Loading store hours...</div> : null}
              {hoursStatus !== "loading" && businessHours.length === 0 ? <div className="p-4 text-sm text-slate-500">No hours configured yet.</div> : null}
              {businessHours.length ? (
                <div className="divide-y divide-slate-200">
                  {businessHours.map((hour) => (
                    <div className="grid gap-3 px-4 py-3 text-sm md:grid-cols-[130px_1fr_120px] md:items-center" key={hour.id ?? `${hour.locationId}-${hour.dayOfWeek}`}>
                      <p className="font-semibold text-slate-950">{dayNames[hour.dayOfWeek] ?? `Day ${hour.dayOfWeek}`}</p>
                      <p className="text-slate-600">{hour.isClosed ? "Closed" : `${toTimeInput(hour.openTime)} - ${toTimeInput(hour.closeTime)}`}</p>
                      <div className="flex gap-2 md:justify-end">
                        <Button type="button" size="icon" variant="outline" aria-label={`Edit ${dayNames[hour.dayOfWeek]} hours`} onClick={() => editBusinessHour(hour)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button type="button" size="icon" variant="outline" aria-label={`Delete ${dayNames[hour.dayOfWeek]} hours`} disabled={hoursStatus === "saving"} onClick={() => void deleteBusinessHour(hour)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <form className="space-y-4 rounded-md border border-slate-200 p-4" onSubmit={(event) => void saveBusinessHour(event)}>
              <div>
                <p className="text-sm font-semibold text-slate-950">{isEditingHour ? "Edit hours" : "Add hours"}</p>
                <p className="mt-1 text-xs text-slate-500">Closed days do not need open or close times.</p>
              </div>
              <Field label="Day of week" required>
                <select
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  value={hourForm.dayOfWeek}
                  onChange={(event) => setHourForm((current) => ({ ...current, dayOfWeek: event.target.value }))}
                >
                  {dayNames.map((day, index) => (
                    <option key={day} value={index}>{day}</option>
                  ))}
                </select>
              </Field>
              <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                <input
                  checked={hourForm.isClosed}
                  className="h-4 w-4 accent-primary"
                  onChange={(event) => setHourForm((current) => ({ ...current, isClosed: event.target.checked }))}
                  type="checkbox"
                />
                Closed all day
              </label>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <Field label="Open time" required={!hourForm.isClosed}>
                  <input
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:bg-slate-100"
                    disabled={hourForm.isClosed}
                    onChange={(event) => setHourForm((current) => ({ ...current, openTime: event.target.value }))}
                    required={!hourForm.isClosed}
                    type="time"
                    value={hourForm.openTime}
                  />
                </Field>
                <Field label="Close time" required={!hourForm.isClosed}>
                  <input
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:bg-slate-100"
                    disabled={hourForm.isClosed}
                    onChange={(event) => setHourForm((current) => ({ ...current, closeTime: event.target.value }))}
                    required={!hourForm.isClosed}
                    type="time"
                    value={hourForm.closeTime}
                  />
                </Field>
              </div>
              {hoursError ? (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{hoursError}</p>
                </div>
              ) : null}
              {hoursMessage ? (
                <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{hoursMessage}</p>
                </div>
              ) : null}
              <DialogFooter className="px-0 pb-0">
                <Button type="button" variant="outline" onClick={clearHourForm}>Clear</Button>
                <Button type="submit" disabled={hoursStatus === "saving"}>
                  {hoursStatus === "saving" ? "Saving..." : isEditingHour ? "Update hours" : "Add hours"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getLocationUrl(location: LocationDto, origin: string) {
  if (!origin || !location.locationCode) {
    return null;
  }

  const url = new URL("/", origin);
  url.searchParams.set("locationCode", location.locationCode);
  return url.toString();
}

function getAuthHeaders() {
  const token = localStorage.getItem("umika_access_token");
  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
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

function toTimeInput(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.slice(0, 5);
}

function getNextAvailableDay(hours: BusinessHour[]) {
  const usedDays = new Set(hours.map((hour) => hour.dayOfWeek));
  const nextDay = dayNames.findIndex((_, index) => !usedDays.has(index));
  return String(nextDay >= 0 ? nextDay : 1);
}

function Field({
  children,
  label,
  required = false,
}: {
  children: React.ReactNode;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">
        {label}
        {required ? <span className="text-primary"> *</span> : null}
      </span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}
