"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AlertCircle, CheckCircle2, Pencil, Plus, RefreshCw, Search, ShieldCheck, Trash2, X } from "lucide-react";

import { LoginRedirectLink } from "@/components/auth/login-redirect-link";
import { StatusPill } from "@/components/manager/status-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SpringPage } from "@/lib/location-types";
import type { RoleDto } from "@/lib/role-types";
import type { UserDto } from "@/lib/user-types";

type UserStatusTone = "ACTIVE" | "INVITED" | "DISABLED";

type UserFormState = {
  id: string;
  email: string;
  phone: string;
  password: string;
  isActive: boolean;
};

type UserRoleDto = {
  userId: string;
  roleId: string;
};

type UserWireDto = UserDto & {
  first_name?: string | null;
  last_name?: string | null;
  is_active?: boolean | null;
  loyalty_points?: number | null;
};

const emptyForm: UserFormState = {
  id: "",
  email: "",
  phone: "",
  password: "",
  isActive: true,
};

export function UserManager() {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [userRoles, setUserRoles] = useState<UserRoleDto[]>([]);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [search, setSearch] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "unauthenticated" | "error">("loading");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [roleActionKey, setRoleActionKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const roleNameById = useMemo(() => new Map(roles.map((role) => [role.id, role.name])), [roles]);
  const userRoleIdsByUserId = useMemo(() => groupUserRolesByUserId(userRoles), [userRoles]);
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter((user) => {
      const roleNames = getUserRoleNamesByUserId(user.id, userRoleIdsByUserId, roleNameById);
      return [user.email, user.phone, user.id, getUserStatus(user), ...roleNames]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query));
    });
  }, [roleNameById, search, userRoleIdsByUserId, users]);

  const loadAll = useCallback(async () => {
    setStatus("loading");
    setError(null);

    const headers = getAuthHeaders();
    const [usersResponse, rolesResponse, userRolesResponse] = await Promise.all([
      fetch("/api/manager/users?page=0&size=500&sort=email,asc", { headers, cache: "no-store" }).catch(() => null),
      fetch("/api/manager/roles?page=0&size=200&sort=name,asc", { headers, cache: "no-store" }).catch(() => null),
      fetch("/api/manager/user-roles?page=0&size=1000&sort=userId,asc", { headers, cache: "no-store" }).catch(() => null),
    ]);

    const failed = [usersResponse, rolesResponse, userRolesResponse].find((response) => !response?.ok);

    if (failed) {
      const body = await failed.json().catch(() => null);
      setStatus(failed.status === 401 ? "unauthenticated" : "error");
      setError(getManagerErrorMessage(failed.status, body, "Unable to load users."));
      return;
    }

    const usersPage = (await usersResponse!.json()) as SpringPage<UserWireDto> | UserWireDto[];
    const rolesPage = (await rolesResponse!.json()) as SpringPage<RoleDto> | RoleDto[];
    const userRolesPage = (await userRolesResponse!.json()) as SpringPage<UserRoleDto> | UserRoleDto[];

    setUsers((Array.isArray(usersPage) ? usersPage : usersPage.content ?? []).map(normalizeUser));
    setRoles(Array.isArray(rolesPage) ? rolesPage : rolesPage.content ?? []);
    setUserRoles(Array.isArray(userRolesPage) ? userRolesPage : userRolesPage.content ?? []);
    setStatus("ready");
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  function updateField<K extends keyof UserFormState>(key: K, value: UserFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startCreate() {
    setForm(emptyForm);
    setIsFormVisible(true);
    setMessage(null);
    setError(null);
  }

  function closeForm() {
    setForm(emptyForm);
    setIsFormVisible(false);
    setMessage(null);
    setError(null);
  }

  function editUser(user: UserDto) {
    setForm({
      id: user.id ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      password: "",
      isActive: user.isActive ?? true,
    });
    setIsFormVisible(true);
    setMessage(null);
    setError(null);
  }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.email.trim()) {
      setError("Email is required.");
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setError(null);

    const payload = {
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      password: form.password.trim() || undefined,
      isActive: form.isActive,
    };

    const response = await fetch(form.id ? `/api/manager/users/${form.id}` : "/api/manager/users", {
      method: form.id ? "PUT" : "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }).catch(() => null);

    setIsSaving(false);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setStatus(response?.status === 401 ? "unauthenticated" : status);
      setError(getManagerErrorMessage(response?.status, body, "Unable to save user."));
      return;
    }

    setMessage(form.id ? "User updated." : "User created.");
    closeForm();
    await loadAll();
  }

  async function deleteUser(user: UserDto) {
    if (!user.id || !window.confirm(`Delete ${user.email}?`)) {
      return;
    }

    setDeletingId(user.id);
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/manager/users/${user.id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    }).catch(() => null);

    setDeletingId(null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setStatus(response?.status === 401 ? "unauthenticated" : status);
      setError(getManagerErrorMessage(response?.status, body, "Unable to delete user."));
      return;
    }

    setMessage("User deleted.");
    await loadAll();
  }

  async function setRoleAssignment(userId: string, roleId: string, grant: boolean) {
    const key = `${userId}:${roleId}`;
    setRoleActionKey(key);
    setMessage(null);
    setError(null);

    const headers = {
      ...getAuthHeaders(),
      ...(grant ? { "Content-Type": "application/json" } : {}),
    };

    const response = await fetch(grant ? "/api/manager/user-roles" : `/api/manager/user-roles/${userId}/${roleId}`, {
      method: grant ? "POST" : "DELETE",
      headers,
      body: grant ? JSON.stringify({ userId, roleId }) : undefined,
    }).catch(() => null);

    setRoleActionKey(null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setStatus(response?.status === 401 ? "unauthenticated" : status);
      setError(getManagerErrorMessage(response?.status, body, "Unable to update role assignment."));
      return;
    }

    setMessage(grant ? "Role granted." : "Role removed.");
    await loadAll();
  }

  if (status === "unauthenticated") {
    return (
      <Card className="rounded-md shadow-none">
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">{error ?? "Log in with an admin account to manage users."}</p>
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
        <Button disabled={status === "loading"} onClick={() => void loadAll()} type="button" variant="outline">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
        <Button onClick={startCreate} type="button">
          <Plus className="h-4 w-4" />
          Add user
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

      {isFormVisible ? (
        <Card className="rounded-md shadow-none">
          <CardHeader className="border-b border-slate-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">{form.id ? "Edit user" : "Add user"}</CardTitle>
                <p className="mt-2 text-sm text-slate-500">
                  Create the user first, then manage role membership through the dedicated assignments below.
                </p>
              </div>
              <Button onClick={closeForm} size="icon" type="button" variant="outline" aria-label="Close user form">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={(event) => void saveUser(event)}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Email" required>
                  <input
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    onChange={(event) => updateField("email", event.target.value)}
                    required
                    type="email"
                    value={form.email}
                  />
                </Field>
                <Field label={form.id ? "New password" : "Password"}>
                  <input
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    onChange={(event) => updateField("password", event.target.value)}
                    placeholder={form.id ? "Leave blank to keep current password" : "Optional if backend auto-invites"}
                    type="password"
                    value={form.password}
                  />
                </Field>
                <Field label="Phone">
                  <input
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    onChange={(event) => updateField("phone", event.target.value)}
                    value={form.phone}
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
                Active user
              </label>

              <div className="rounded-md border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Role assignments</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {form.id ? "Grant or revoke roles directly through the user-role API." : "Save the user first to manage role membership."}
                    </p>
                  </div>
                  <ShieldCheck className="h-4 w-4 text-slate-400" />
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {roles.length === 0 ? (
                    <p className="text-sm text-slate-500">No roles available.</p>
                  ) : form.id ? (
                    roles.map((role) => {
                      const roleId = role.id ?? "";
                      const assigned = isRoleAssigned(userRoles, form.id, roleId);
                      const actionKey = `${form.id}:${roleId}`;

                      return (
                        <label
                          key={roleId || role.name}
                          className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
                        >
                          <input
                            checked={assigned}
                            className="h-4 w-4 accent-primary"
                            disabled={!roleId || roleActionKey === actionKey}
                            onChange={() => void setRoleAssignment(form.id, roleId, !assigned)}
                            type="checkbox"
                          />
                          <span className="truncate font-mono">{role.name}</span>
                        </label>
                      );
                    })
                  ) : (
                    <p className="text-sm text-slate-500">Save the user before assigning roles.</p>
                  )}
                </div>
              </div>

              <Button className="w-full" disabled={isSaving} type="submit">
                {form.id ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {isSaving ? "Saving..." : form.id ? "Update user" : "Create user"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden rounded-md shadow-none">
        <CardHeader className="border-b border-slate-200">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <CardTitle className="text-base">Users</CardTitle>
              <p className="mt-2 text-sm text-slate-500">{filteredUsers.length} users shown.</p>
            </div>
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search email, phone, role..."
                value={search}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {status === "loading" ? (
            <div className="p-5 text-sm text-slate-500">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <div className="grid min-w-[960px] grid-cols-[1.5fr_1fr_120px_180px] border-b border-slate-200 bg-slate-100 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                <span>User</span>
                <span>Roles</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {filteredUsers.map((user) => {
                const roleNames = getUserRoleNamesByUserId(user.id, userRoleIdsByUserId, roleNameById);

                return (
                  <div
                    className="grid min-w-[960px] grid-cols-[1.5fr_1fr_120px_180px] items-center border-b border-slate-200 px-5 py-4 last:border-b-0"
                    key={user.id ?? user.email}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">{getUserDisplayName(user)}</p>
                      <p className="mt-1 truncate font-mono text-xs text-slate-400">{user.id}</p>
                      {user.phone ? <p className="mt-1 truncate text-sm text-slate-500">{user.phone}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {roleNames.length === 0 ? (
                        <span className="text-sm text-slate-500">No roles</span>
                      ) : (
                        roleNames.map((role) => (
                          <Badge key={role} className="rounded-md bg-slate-100 text-slate-700">
                            {role}
                          </Badge>
                        ))
                      )}
                    </div>
                    <StatusPill tone={getUserStatus(user)}>{getUserStatus(user)}</StatusPill>
                    <div className="flex items-center gap-2">
                      <Button onClick={() => editUser(user)} size="icon" type="button" variant="outline" aria-label={`Edit ${user.email}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button onClick={() => editUser(user)} size="icon" type="button" variant="outline" aria-label={`Manage roles for ${user.email}`}>
                        <ShieldCheck className="h-4 w-4" />
                      </Button>
                      <Button
                        disabled={deletingId === user.id}
                        onClick={() => void deleteUser(user)}
                        size="icon"
                        type="button"
                        variant="outline"
                        aria-label={`Delete ${user.email}`}
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
  );
}

function normalizeUser(user: UserWireDto): UserDto {
  return {
    ...user,
    isActive: user.isActive ?? user.is_active ?? null,
    loyaltyPoints: user.loyaltyPoints ?? user.loyalty_points ?? null,
  };
}

function groupUserRolesByUserId(userRoles: UserRoleDto[]) {
  const grouped = new Map<string, Set<string>>();

  for (const userRole of userRoles) {
    if (!userRole.userId || !userRole.roleId) {
      continue;
    }

    const roles = grouped.get(userRole.userId) ?? new Set<string>();
    roles.add(userRole.roleId);
    grouped.set(userRole.userId, roles);
  }

  return grouped;
}

function getUserDisplayName(user: UserDto) {
  return user.name || user.email;
}

function getUserStatus(user: UserDto): UserStatusTone {
  if (user.status === "ACTIVE" || user.status === "INVITED" || user.status === "DISABLED") {
    return user.status;
  }

  return user.isActive === false ? "DISABLED" : "ACTIVE";
}

function getUserRoleNamesByUserId(
  userId: string | null | undefined,
  userRoleIdsByUserId: Map<string, Set<string>>,
  roleNameById: Map<string | null, string>,
) {
  if (!userId) {
    return [];
  }

  const roleIds = [...(userRoleIdsByUserId.get(userId) ?? new Set<string>())];
  return roleIds.map((roleId) => roleNameById.get(roleId)).filter((role): role is string => Boolean(role)).sort((a, b) => a.localeCompare(b));
}

function isRoleAssigned(userRoles: UserRoleDto[], userId: string, roleId: string) {
  return userRoles.some((entry) => entry.userId === userId && entry.roleId === roleId);
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
    return "Your account is logged in, but it does not have permission to manage users.";
  }

  return fallback;
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
