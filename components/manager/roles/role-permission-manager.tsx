"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AlertCircle, CheckCircle2, ChevronRight, Pencil, Plus, RefreshCw, Save, ShieldCheck, Trash2, X } from "lucide-react";

import { LoginRedirectLink } from "@/components/auth/login-redirect-link";
import { ManagerIcon } from "@/components/manager/manager-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SpringPage } from "@/lib/location-types";
import type { RoleDto, RoleMenuDto } from "@/lib/role-types";
import type { SystemMenuDto } from "@/lib/system-menu-types";
import { cn } from "@/lib/utils";

type MenuNode = SystemMenuDto & {
  children: MenuNode[];
};

const emptyRole = {
  id: "",
  name: "",
};

export function RolePermissionManager() {
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [menus, setMenus] = useState<SystemMenuDto[]>([]);
  const [roleMenus, setRoleMenus] = useState<RoleMenuDto[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [roleForm, setRoleForm] = useState(emptyRole);
  const [isRoleFormVisible, setIsRoleFormVisible] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "unauthenticated" | "error">("loading");
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [isSavingMenus, setIsSavingMenus] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedMenuIds = useMemo(
    () => new Set(roleMenus.filter((item) => item.roleId === selectedRoleId).map((item) => item.menuId)),
    [roleMenus, selectedRoleId],
  );

  const menuTree = useMemo(() => buildMenuTree(menus), [menus]);
  const selectedRole = roles.find((role) => role.id === selectedRoleId);

  const loadAll = useCallback(async () => {
    const token = localStorage.getItem("umika_access_token");

    if (!token) {
      setStatus("unauthenticated");
      return;
    }

    setStatus("loading");
    setError(null);

    const headers = { Authorization: `Bearer ${token}` };
    const [rolesResponse, menusResponse, roleMenusResponse] = await Promise.all([
      fetch("/api/manager/roles?page=0&size=200&sort=name,asc", { headers, cache: "no-store" }).catch(() => null),
      fetch("/api/manager/system-menus?page=0&size=500&sort=sortOrder,asc", { headers, cache: "no-store" }).catch(() => null),
      fetch("/api/manager/role-menus?page=0&size=1000", { headers, cache: "no-store" }).catch(() => null),
    ]);

    const failed = [rolesResponse, menusResponse, roleMenusResponse].find((response) => !response?.ok);

    if (failed) {
      const body = await failed.json().catch(() => null);
      setStatus(failed.status === 401 || failed.status === 403 ? "unauthenticated" : "error");
      setError(typeof body?.message === "string" ? body.message : "Unable to load roles and menu permissions.");
      return;
    }

    const rolesPage = (await rolesResponse!.json()) as SpringPage<RoleDto>;
    const menusPage = (await menusResponse!.json()) as SpringPage<SystemMenuDto>;
    const roleMenusPage = (await roleMenusResponse!.json()) as SpringPage<RoleMenuDto>;
    const loadedRoles = rolesPage.content ?? [];

    setRoles(loadedRoles);
    setMenus(menusPage.content ?? []);
    setRoleMenus(roleMenusPage.content ?? []);
    setSelectedRoleId((current) => current || loadedRoles[0]?.id || "");
    setStatus("ready");
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  function startCreateRole() {
    setRoleForm(emptyRole);
    setMessage(null);
    setError(null);
    setIsRoleFormVisible(true);
  }

  function editRole(role: RoleDto) {
    setRoleForm({ id: role.id ?? "", name: role.name });
    setMessage(null);
    setError(null);
    setIsRoleFormVisible(true);
  }

  function closeRoleForm() {
    setRoleForm(emptyRole);
    setIsRoleFormVisible(false);
  }

  async function saveRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = localStorage.getItem("umika_access_token");

    if (!token) {
      setStatus("unauthenticated");
      return;
    }

    setIsSavingRole(true);
    setMessage(null);
    setError(null);

    const payload: RoleDto = {
      id: roleForm.id || null,
      name: roleForm.name.trim(),
      createdAt: null,
      updatedAt: null,
    };
    const response = await fetch(roleForm.id ? `/api/manager/roles/${roleForm.id}` : "/api/manager/roles", {
      method: roleForm.id ? "PUT" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }).catch(() => null);

    setIsSavingRole(false);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setError(typeof body?.message === "string" ? body.message : "Unable to save role.");
      return;
    }

    const saved = (await response.json()) as RoleDto;
    setMessage(roleForm.id ? "Role updated." : "Role created.");
    setSelectedRoleId(saved.id ?? selectedRoleId);
    closeRoleForm();
    await loadAll();
  }

  async function deleteRole(role: RoleDto) {
    if (!role.id || !window.confirm(`Delete ${role.name}?`)) {
      return;
    }

    const token = localStorage.getItem("umika_access_token");

    if (!token) {
      setStatus("unauthenticated");
      return;
    }

    setMessage(null);
    setError(null);

    const response = await fetch(`/api/manager/roles/${role.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setError(typeof body?.message === "string" ? body.message : "Unable to delete role.");
      return;
    }

    setSelectedRoleId((current) => (current === role.id ? "" : current));
    setMessage("Role deleted.");
    await loadAll();
  }

  function getDescendantIds(node: MenuNode): string[] {
    return [node.id, ...node.children.flatMap(getDescendantIds)].filter((id): id is string => Boolean(id));
  }

  async function applyMenuSelection(nextMenuIds: Set<string>) {
    if (!selectedRoleId) {
      return;
    }

    const token = localStorage.getItem("umika_access_token");

    if (!token) {
      setStatus("unauthenticated");
      return;
    }

    setIsSavingMenus(true);
    setMessage(null);
    setError(null);

    const currentMenuIds = new Set(roleMenus.filter((item) => item.roleId === selectedRoleId).map((item) => item.menuId));
    const toAdd = [...nextMenuIds].filter((menuId) => !currentMenuIds.has(menuId));
    const toDelete = [...currentMenuIds].filter((menuId) => !nextMenuIds.has(menuId));

    const requests = [
      ...toAdd.map((menuId) =>
        fetch("/api/manager/role-menus", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ roleId: selectedRoleId, menuId }),
        }),
      ),
      ...toDelete.map((menuId) =>
        fetch(`/api/manager/role-menus?roleId=${encodeURIComponent(selectedRoleId)}&menuId=${encodeURIComponent(menuId)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }),
      ),
    ];

    const responses = await Promise.all(requests.map((request) => request.catch(() => null)));
    setIsSavingMenus(false);

    if (responses.some((response) => !response?.ok)) {
      setError("Unable to save all menu assignments.");
      await loadAll();
      return;
    }

    setMessage("Role menu permissions updated.");
    await loadAll();
  }

  function toggleNode(node: MenuNode) {
    const ids = getDescendantIds(node);
    const next = new Set(selectedMenuIds);
    const shouldSelect = ids.some((id) => !next.has(id));

    for (const id of ids) {
      if (shouldSelect) {
        next.add(id);
      } else {
        next.delete(id);
      }
    }

    void applyMenuSelection(next);
  }

  if (status === "unauthenticated") {
    return (
      <Card className="rounded-md shadow-none">
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">{error ?? "Log in with an admin account to manage roles and permissions."}</p>
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
        <Button onClick={() => void loadAll()} type="button" variant="outline">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
        <Button onClick={startCreateRole} type="button">
          <Plus className="h-4 w-4" />
          Add role
        </Button>
      </div>

      {isRoleFormVisible ? (
        <Card className="rounded-md shadow-none">
          <CardHeader className="border-b border-slate-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">{roleForm.id ? "Edit role" : "Add role"}</CardTitle>
                <p className="mt-2 text-sm text-slate-500">Use names like ROLE_ADMIN, ROLE_MANAGER, or ROLE_STAFF.</p>
              </div>
              <Button onClick={closeRoleForm} size="icon" type="button" variant="outline" aria-label="Close role form">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(event) => void saveRole(event)}>
              <input
                className="h-10 flex-1 rounded-md border border-slate-200 bg-white px-3 font-mono text-sm uppercase outline-none focus:ring-2 focus:ring-ring"
                onChange={(event) => setRoleForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="ROLE_MANAGER"
                required
                value={roleForm.name}
              />
              <Button disabled={isSavingRole} type="submit">
                <Save className="h-4 w-4" />
                {isSavingRole ? "Saving..." : "Save role"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

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

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="rounded-md shadow-none">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-base">Roles</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {status === "loading" ? (
              <div className="p-5 text-sm text-slate-500">Loading roles...</div>
            ) : roles.length === 0 ? (
              <div className="p-5 text-sm text-slate-500">No roles yet.</div>
            ) : (
              roles.map((role) => (
                <div
                  className={cn(
                    "flex items-center justify-between gap-3 border-b border-slate-200 p-4 last:border-b-0",
                    selectedRoleId === role.id && "bg-primary/5",
                  )}
                  key={role.id ?? role.name}
                >
                  <button className="min-w-0 flex-1 text-left" onClick={() => setSelectedRoleId(role.id ?? "")} type="button">
                    <p className="truncate font-mono text-sm font-semibold text-slate-950">{role.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{role.id}</p>
                  </button>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => editRole(role)} size="icon" type="button" variant="outline" aria-label={`Edit ${role.name}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => void deleteRole(role)} size="icon" type="button" variant="outline" aria-label={`Delete ${role.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-md shadow-none">
          <CardHeader className="border-b border-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Menu access
                </CardTitle>
                <p className="mt-2 text-sm text-slate-500">
                  {selectedRole ? `Select system menus visible to ${selectedRole.name}. Parent toggles include all child layers.` : "Select a role to edit menu access."}
                </p>
              </div>
              {isSavingMenus ? <span className="text-xs font-semibold text-slate-500">Saving...</span> : null}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedRoleId ? (
              <div className="text-sm text-slate-500">No role selected.</div>
            ) : menuTree.length === 0 ? (
              <div className="text-sm text-slate-500">No system menus available.</div>
            ) : (
              <div className="space-y-2">
                {menuTree.map((node) => (
                  <MenuNodeRow key={node.id ?? node.code} node={node} selectedMenuIds={selectedMenuIds} toggleNode={toggleNode} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MenuNodeRow({
  node,
  selectedMenuIds,
  toggleNode,
  depth = 0,
}: {
  node: MenuNode;
  selectedMenuIds: Set<string>;
  toggleNode: (node: MenuNode) => void;
  depth?: number;
}) {
  const id = node.id ?? "";
  const checked = selectedMenuIds.has(id);
  const descendantIds = node.children.flatMap((child) => [child.id, ...child.children.flatMap((grandchild) => grandchild.id)]).filter(Boolean);
  const hasSomeChildren = descendantIds.some((childId) => selectedMenuIds.has(childId as string));

  return (
    <div>
      <label
        className={cn(
          "flex min-h-11 items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm",
          checked && "border-primary/30 bg-primary/5",
        )}
        style={{ marginLeft: depth * 18 }}
      >
        <input checked={checked} className="h-4 w-4 accent-primary" onChange={() => toggleNode(node)} type="checkbox" />
        {node.children.length > 0 ? <ChevronRight className="h-4 w-4 text-slate-400" /> : <span className="h-4 w-4" />}
        <ManagerIcon name={node.icon ?? "LayoutDashboard"} className="h-4 w-4 text-primary" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-slate-950">{node.name}</span>
          <span className="block truncate font-mono text-xs text-slate-500">{node.code}</span>
        </span>
        {hasSomeChildren && !checked ? <span className="text-xs font-semibold text-primary">partial</span> : null}
      </label>
      {node.children.length > 0 ? (
        <div className="mt-2 space-y-2">
          {node.children.map((child) => (
            <MenuNodeRow key={child.id ?? child.code} node={child} selectedMenuIds={selectedMenuIds} toggleNode={toggleNode} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function buildMenuTree(menus: SystemMenuDto[]): MenuNode[] {
  const nodes = new Map<string, MenuNode>();
  const roots: MenuNode[] = [];

  for (const menu of menus) {
    if (!menu.id) {
      continue;
    }
    nodes.set(menu.id, { ...menu, children: [] });
  }

  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  function sortNodes(items: MenuNode[]) {
    items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
    for (const item of items) {
      sortNodes(item.children);
    }
  }

  sortNodes(roots);
  return roots;
}
