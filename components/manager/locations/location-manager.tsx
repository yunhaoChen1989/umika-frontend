"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { AlertCircle, CheckCircle2, Copy, ExternalLink, Pencil, Plus, RefreshCw, Store, Trash2, X } from "lucide-react";

import { StatusPill } from "@/components/manager/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const isEditing = Boolean(form.id);

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

  if (status === "unauthenticated") {
    return (
      <Card className="rounded-md shadow-none">
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">{error ?? "Log in with a manager account to manage locations."}</p>
          <Button asChild className="w-full sm:w-auto">
            <a href="/login">Login</a>
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
