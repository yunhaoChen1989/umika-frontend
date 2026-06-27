"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AlertCircle, CheckCircle2, Pencil, RefreshCw, Search, ShieldPlus, Trash2, X } from "lucide-react";

import { LoginRedirectLink } from "@/components/auth/login-redirect-link";
import { StatusPill } from "@/components/manager/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LocationDto, SpringPage } from "@/lib/location-types";
import type { ManagerUserLookupDto, UserPermissionDto } from "@/lib/user-permission-types";
import { cn } from "@/lib/utils";

type UserPermissionWireDto = Omit<UserPermissionDto, "userId" | "permissionCode" | "locationId" | "isGranted"> & {
  userId?: string;
  user_id?: string;
  permissionCode?: string;
  permission_code?: string;
  locationId?: string | null;
  location_id?: string | null;
  isGranted?: boolean;
  is_granted?: boolean;
};

type PermissionFormState = {
  id: string;
  permissionCode: string;
  locationId: string;
  isGranted: boolean;
};

const emptyForm: PermissionFormState = {
  id: "",
  permissionCode: "",
  locationId: "",
  isGranted: true,
};

export function UserPermissionManager() {
  const [users, setUsers] = useState<ManagerUserLookupDto[]>([]);
  const [locations, setLocations] = useState<LocationDto[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermissionDto[]>([]);
  const [selectedUser, setSelectedUser] = useState<ManagerUserLookupDto | null>(null);
  const [emailQuery, setEmailQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [form, setForm] = useState<PermissionFormState>(emptyForm);
  const [status, setStatus] = useState<"loading" | "ready" | "unauthenticated" | "error">("loading");
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isSavingPermission, setIsSavingPermission] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const locationById = useMemo(() => new Map(locations.map((location) => [location.id, location])), [locations]);
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
  const selectedLocation = form.locationId ? locationById.get(form.locationId) ?? null : null;
  const selectedUserPermissions = selectedUser?.id ? userPermissions.filter((item) => item.userId === selectedUser.id) : [];

  const loadLocations = useCallback(async () => {
    const token = localStorage.getItem("umika_access_token");

    if (!token) {
      setStatus("unauthenticated");
      return;
    }

    const response = await fetch("/api/manager/locations?page=0&size=300&sort=name,asc", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setStatus(response?.status === 401 || response?.status === 403 ? "unauthenticated" : "error");
      setError(typeof body?.message === "string" ? body.message : "Unable to load store locations.");
      return;
    }

    const page = (await response.json()) as SpringPage<LocationDto>;
    setLocations(page.content ?? []);
    setStatus("ready");
  }, []);

  const loadUserPermissions = useCallback(async (userId?: string | null) => {
    const token = localStorage.getItem("umika_access_token");

    if (!token) {
      setStatus("unauthenticated");
      return;
    }

    const url = new URL("/api/manager/user-permissions", window.location.origin);
    url.searchParams.set("page", "0");
    url.searchParams.set("size", "1000");

    if (userId) {
      url.searchParams.set("userId", userId);
    }

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setStatus(response?.status === 401 || response?.status === 403 ? "unauthenticated" : "error");
      setError(typeof body?.message === "string" ? body.message : "Unable to load user permissions.");
      return;
    }

    const page = (await response.json()) as SpringPage<UserPermissionWireDto>;
    const normalized = (page.content ?? []).map(normalizeUserPermission).filter((item): item is UserPermissionDto => Boolean(item));
    setUserPermissions((current) => {
      if (!userId) {
        return normalized;
      }

      return [...current.filter((item) => item.userId !== userId), ...normalized];
    });
    setStatus("ready");
  }, []);

  useEffect(() => {
    void loadLocations();
    void loadUserPermissions();
  }, [loadLocations, loadUserPermissions]);

  async function searchUsers(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    const token = localStorage.getItem("umika_access_token");

    if (!token) {
      setStatus("unauthenticated");
      return;
    }

    const email = emailQuery.trim();

    if (!email) {
      setError("Enter an email address to search.");
      return;
    }

    setIsSearchingUsers(true);
    setMessage(null);
    setError(null);

    const url = new URL("/api/manager/users", window.location.origin);
    url.searchParams.set("email", email);
    url.searchParams.set("page", "0");
    url.searchParams.set("size", "20");

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => null);

    setIsSearchingUsers(false);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setStatus(response?.status === 401 || response?.status === 403 ? "unauthenticated" : status);
      setError(typeof body?.message === "string" ? body.message : "Unable to search users by email.");
      return;
    }

    const payload = (await response.json()) as SpringPage<ManagerUserLookupDto> | ManagerUserLookupDto[];
    const loadedUsers = Array.isArray(payload) ? payload : payload.content ?? [];
    setUsers(loadedUsers);

    if (loadedUsers.length === 1) {
      selectUser(loadedUsers[0]);
    }

    if (loadedUsers.length === 0) {
      setMessage("No users found for that email search.");
    }
  }

  function selectUser(user: ManagerUserLookupDto) {
    setSelectedUser(user);
    setEmailQuery(user.email);
    setForm(emptyForm);
    setMessage(null);
    setError(null);
    void loadUserPermissions(user.id);
  }

  function selectLocation(location: LocationDto) {
    setForm((current) => ({ ...current, locationId: location.id ?? "" }));
    setLocationQuery(location.name);
  }

  function startEdit(permission: UserPermissionDto) {
    const location = permission.locationId ? locationById.get(permission.locationId) : null;

    setForm({
      id: permission.id ?? "",
      permissionCode: permission.permissionCode,
      locationId: permission.locationId ?? "",
      isGranted: permission.isGranted,
    });
    setLocationQuery(location?.name ?? "");
    setMessage(null);
    setError(null);
  }

  function resetForm() {
    setForm(emptyForm);
    setLocationQuery("");
    setMessage(null);
    setError(null);
  }

  async function savePermission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = localStorage.getItem("umika_access_token");

    if (!token) {
      setStatus("unauthenticated");
      return;
    }

    if (!selectedUser?.id) {
      setError("Search and select a user first.");
      return;
    }

    const permissionCode = form.permissionCode.trim().toUpperCase();

    if (!permissionCode) {
      setError("Permission code is required.");
      return;
    }

    setIsSavingPermission(true);
    setMessage(null);
    setError(null);

    const payload = {
      id: form.id || null,
      userId: selectedUser.id,
      permissionCode,
      locationId: form.locationId || null,
      isGranted: form.isGranted,
    };
    const response = await fetch(form.id ? `/api/manager/user-permissions/${form.id}` : "/api/manager/user-permissions", {
      method: form.id ? "PUT" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }).catch(() => null);

    setIsSavingPermission(false);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setError(typeof body?.message === "string" ? body.message : "Unable to save user permission.");
      return;
    }

    setMessage(form.id ? "User permission updated." : "User permission created.");
    resetForm();
    await loadUserPermissions(selectedUser.id);
  }

  async function deletePermission(permission: UserPermissionDto) {
    if (!permission.id || !selectedUser?.id || !window.confirm(`Delete ${permission.permissionCode}?`)) {
      return;
    }

    const token = localStorage.getItem("umika_access_token");

    if (!token) {
      setStatus("unauthenticated");
      return;
    }

    setDeletingId(permission.id);
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/manager/user-permissions/${permission.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null);

    setDeletingId(null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setError(typeof body?.message === "string" ? body.message : "Unable to delete user permission.");
      return;
    }

    setMessage("User permission deleted.");
    await loadUserPermissions(selectedUser.id);
  }

  if (status === "unauthenticated") {
    return (
      <Card className="rounded-md shadow-none">
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">{error ?? "Log in with an admin account to manage user permissions."}</p>
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
          onClick={() => {
            void loadLocations();
            void loadUserPermissions(selectedUser?.id);
          }}
          type="button"
          variant="outline"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
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

      <div className="grid gap-6 xl:grid-cols-[390px_1fr]">
        <div className="space-y-6">
          <Card className="rounded-md shadow-none">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-base">User search</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="space-y-3" onSubmit={(event) => void searchUsers(event)}>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Email</span>
                  <input
                    className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    onChange={(event) => setEmailQuery(event.target.value)}
                    placeholder="manager@umikasushi.ca"
                    type="email"
                    value={emailQuery}
                  />
                </label>
                <Button className="w-full" disabled={isSearchingUsers} type="submit">
                  <Search className="h-4 w-4" />
                  {isSearchingUsers ? "Searching..." : "Search user"}
                </Button>
              </form>

              <div className="space-y-2">
                {users.map((user) => (
                  <button
                    className={cn(
                      "block w-full rounded-md border border-slate-200 px-3 py-2 text-left text-sm text-slate-600",
                      selectedUser?.id === user.id && "border-primary/40 bg-primary/5 text-primary",
                    )}
                    key={user.id ?? user.email}
                    onClick={() => selectUser(user)}
                    type="button"
                  >
                    <span className="block font-semibold text-slate-950">{getUserDisplayName(user)}</span>
                    <span className="mt-1 block truncate text-xs text-slate-500">{user.email}</span>
                    <span className="mt-1 block truncate font-mono text-xs text-slate-400">{user.id}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-md shadow-none">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-base">{form.id ? "Edit permission" : "Add permission"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={(event) => void savePermission(event)}>
                <Field label="Selected user">
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    {selectedUser ? (
                      <>
                        <p className="font-semibold text-slate-950">{getUserDisplayName(selectedUser)}</p>
                        <p className="mt-1 truncate">{selectedUser.email}</p>
                        <p className="mt-1 truncate font-mono text-xs">{selectedUser.id}</p>
                      </>
                    ) : (
                      "Search and select a user first."
                    )}
                  </div>
                </Field>

                <Field label="Permission code" required>
                  <input
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 font-mono text-sm uppercase outline-none focus:ring-2 focus:ring-ring"
                    onChange={(event) => setForm((current) => ({ ...current, permissionCode: event.target.value }))}
                    placeholder="STORE_EDIT"
                    required
                    value={form.permissionCode}
                  />
                </Field>

                <Field label="Store/location">
                  <input
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    onChange={(event) => {
                      setLocationQuery(event.target.value);
                      setForm((current) => ({ ...current, locationId: "" }));
                    }}
                    placeholder="Search by store name, code, city, or address"
                    value={locationQuery}
                  />
                  {selectedLocation ? (
                    <div className="mt-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                      <p className="font-semibold text-slate-950">{selectedLocation.name}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{selectedLocation.locationCode ?? selectedLocation.id}</p>
                    </div>
                  ) : null}
                  <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                    {filteredLocations.map((location) => (
                      <button
                        className="block w-full rounded-md border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50"
                        key={location.id ?? location.name}
                        onClick={() => selectLocation(location)}
                        type="button"
                      >
                        <span className="block font-semibold text-slate-950">{location.name}</span>
                        <span className="mt-1 block truncate text-xs text-slate-500">
                          {[location.locationCode, location.addressLine1, location.city].filter(Boolean).join(" / ")}
                        </span>
                      </button>
                    ))}
                  </div>
                  <Button
                    className="mt-2"
                    onClick={() => {
                      setForm((current) => ({ ...current, locationId: "" }));
                      setLocationQuery("");
                    }}
                    type="button"
                    variant="outline"
                  >
                    Use global permission
                  </Button>
                </Field>

                <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                  <input
                    checked={form.isGranted}
                    className="h-4 w-4 accent-primary"
                    onChange={(event) => setForm((current) => ({ ...current, isGranted: event.target.checked }))}
                    type="checkbox"
                  />
                  Permission is granted
                </label>

                <div className="flex gap-2">
                  <Button className="flex-1" disabled={isSavingPermission || !selectedUser?.id} type="submit">
                    <ShieldPlus className="h-4 w-4" />
                    {isSavingPermission ? "Saving..." : form.id ? "Update permission" : "Add permission"}
                  </Button>
                  {form.id ? (
                    <Button onClick={resetForm} type="button" variant="outline" aria-label="Cancel edit">
                      <X className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-md shadow-none">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-base">Permission records</CardTitle>
            <p className="mt-2 text-sm text-slate-500">
              {selectedUser ? `Direct store/location permissions for ${selectedUser.email}.` : "Search and select a user to view direct permissions."}
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {status === "loading" ? (
              <div className="p-5 text-sm text-slate-500">Loading permissions...</div>
            ) : !selectedUser ? (
              <div className="p-5 text-sm text-slate-500">No user selected.</div>
            ) : selectedUserPermissions.length === 0 ? (
              <div className="p-5 text-sm text-slate-500">No direct permissions for this user yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <div className="grid min-w-[840px] grid-cols-[1.2fr_1.4fr_120px_150px] border-b border-slate-200 bg-slate-100 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <span>Permission</span>
                  <span>Store/location</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>
                {selectedUserPermissions.map((permission) => {
                  const location = permission.locationId ? locationById.get(permission.locationId) : null;

                  return (
                    <div
                      className="grid min-w-[840px] grid-cols-[1.2fr_1.4fr_120px_150px] items-center border-b border-slate-200 px-5 py-4 last:border-b-0"
                      key={permission.id ?? `${permission.userId}-${permission.permissionCode}-${permission.locationId ?? "global"}`}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm font-semibold text-slate-950">{permission.permissionCode}</p>
                        <p className="mt-1 truncate font-mono text-xs text-slate-500">{permission.id}</p>
                      </div>
                      <div className="min-w-0 text-sm text-slate-600">
                        <p className="truncate font-semibold text-slate-950">{location?.name ?? "Global"}</p>
                        <p className="mt-1 truncate font-mono text-xs text-slate-500">{location?.locationCode ?? permission.locationId ?? "All locations"}</p>
                      </div>
                      <StatusPill tone={permission.isGranted ? "ACTIVE" : "DISABLED"}>{permission.isGranted ? "GRANTED" : "DENIED"}</StatusPill>
                      <div className="flex items-center gap-2">
                        <Button onClick={() => startEdit(permission)} size="icon" type="button" variant="outline" aria-label={`Edit ${permission.permissionCode}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          disabled={deletingId === permission.id}
                          onClick={() => void deletePermission(permission)}
                          size="icon"
                          type="button"
                          variant="outline"
                          aria-label={`Delete ${permission.permissionCode}`}
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

function normalizeUserPermission(permission: UserPermissionWireDto): UserPermissionDto | null {
  const userId = permission.userId ?? permission.user_id;
  const permissionCode = permission.permissionCode ?? permission.permission_code;
  const locationId = permission.locationId ?? permission.location_id ?? null;
  const isGranted = permission.isGranted ?? permission.is_granted ?? true;

  if (!userId || !permissionCode) {
    return null;
  }

  return {
    id: permission.id ?? null,
    userId,
    permissionCode,
    locationId,
    isGranted,
    createdAt: permission.createdAt ?? null,
    updatedAt: permission.updatedAt ?? null,
  };
}

function getUserDisplayName(user: ManagerUserLookupDto) {
  return user.name || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
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
