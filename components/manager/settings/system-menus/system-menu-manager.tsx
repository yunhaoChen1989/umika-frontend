"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AlertCircle, CheckCircle2, ChevronRight, Eye, EyeOff, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";

import { LoginRedirectLink } from "@/components/auth/login-redirect-link";
import { ManagerIcon } from "@/components/manager/manager-icon";
import { StatusPill } from "@/components/manager/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SpringPage } from "@/lib/location-types";
import type { SystemMenuDto, SystemMenuUpsertRequest } from "@/lib/system-menu-types";

type SystemMenuFormState = {
  id: string;
  parentId: string;
  name: string;
  code: string;
  path: string;
  component: string;
  icon: string;
  menuType: string;
  sortOrder: string;
  isVisible: boolean;
  isEnabled: boolean;
};

type SystemMenuNode = SystemMenuDto & {
  children: SystemMenuNode[];
};

const emptyForm: SystemMenuFormState = {
  id: "",
  parentId: "",
  name: "",
  code: "",
  path: "",
  component: "",
  icon: "LayoutDashboard",
  menuType: "MENU",
  sortOrder: "0",
  isVisible: true,
  isEnabled: true,
};

export function SystemMenuManager() {
  const [menus, setMenus] = useState<SystemMenuDto[]>([]);
  const [form, setForm] = useState<SystemMenuFormState>(emptyForm);
  const [status, setStatus] = useState<"loading" | "ready" | "unauthenticated" | "error">("loading");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(form.id);

  const sortedMenus = useMemo(
    () => [...menus].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)),
    [menus],
  );
  const menuTree = useMemo(() => buildMenuTree(menus), [menus]);

  const parentOptions = useMemo(() => sortedMenus.filter((menu) => menu.id !== form.id), [form.id, sortedMenus]);

  const loadMenus = useCallback(async () => {
    const token = localStorage.getItem("umika_access_token");

    if (!token) {
      setStatus("unauthenticated");
      return;
    }

    setStatus("loading");
    setError(null);

    const response = await fetch("/api/manager/system-menus?page=0&size=300&sort=sortOrder,asc", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }).catch(() => null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setStatus(response?.status === 401 || response?.status === 403 ? "unauthenticated" : "error");
      setError(typeof body?.message === "string" ? body.message : "Unable to load system menus.");
      return;
    }

    const page = (await response.json()) as SpringPage<SystemMenuDto>;
    setMenus(page.content ?? []);
    setStatus("ready");
  }, []);

  useEffect(() => {
    void loadMenus();
  }, [loadMenus]);

  function updateField<K extends keyof SystemMenuFormState>(key: K, value: SystemMenuFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startCreate() {
    setForm(emptyForm);
    setMessage(null);
    setError(null);
    setIsFormVisible(true);
  }

  function startCreateChild(parent: SystemMenuDto) {
    const siblingSortOrders = menus.filter((menu) => menu.parentId === parent.id).map((menu) => menu.sortOrder ?? 0);
    const nextSortOrder = siblingSortOrders.length > 0 ? Math.max(...siblingSortOrders) + 10 : 10;

    setForm({
      ...emptyForm,
      parentId: parent.id ?? "",
      path: parent.path ? `${parent.path}/` : "/manager/",
      component: parent.component ? `${parent.component}/` : "",
      sortOrder: String(nextSortOrder),
    });
    setMessage(null);
    setError(null);
    setIsFormVisible(true);
  }

  function selectMenu(menu: SystemMenuDto) {
    setMessage(null);
    setError(null);
    setForm({
      id: menu.id ?? "",
      parentId: menu.parentId ?? "",
      name: menu.name ?? "",
      code: menu.code ?? "",
      path: menu.path ?? "",
      component: menu.component ?? "",
      icon: menu.icon ?? "LayoutDashboard",
      menuType: menu.menuType ?? "MENU",
      sortOrder: String(menu.sortOrder ?? 0),
      isVisible: menu.isVisible ?? true,
      isEnabled: menu.isEnabled ?? true,
    });
    setIsFormVisible(true);
  }

  function resetForm() {
    setForm(emptyForm);
    setMessage(null);
    setError(null);
  }

  function closeForm() {
    resetForm();
    setIsFormVisible(false);
  }

  function toPayload(): SystemMenuUpsertRequest {
    return {
      parentId: form.parentId || null,
      name: form.name.trim(),
      code: form.code.trim(),
      path: form.path.trim() || null,
      component: form.component.trim() || null,
      icon: form.icon.trim() || null,
      menuType: form.menuType.trim() || "MENU",
      sortOrder: form.sortOrder.trim() ? Number(form.sortOrder) : null,
      isVisible: form.isVisible,
      isEnabled: form.isEnabled,
    };
  }

  async function saveMenu(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = localStorage.getItem("umika_access_token");

    if (!token) {
      setStatus("unauthenticated");
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setError(null);

    const response = await fetch(form.id ? `/api/manager/system-menus/${form.id}` : "/api/manager/system-menus", {
      method: form.id ? "PUT" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(toPayload()),
    }).catch(() => null);

    setIsSaving(false);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setError(typeof body?.message === "string" ? body.message : "Unable to save system menu.");
      return;
    }

    setMessage(form.id ? "System menu updated." : "System menu created.");
    closeForm();
    await loadMenus();
  }

  async function deleteMenu(menu: SystemMenuDto) {
    if (!menu.id) {
      return;
    }

    const token = localStorage.getItem("umika_access_token");

    if (!token) {
      setStatus("unauthenticated");
      return;
    }

    if (!window.confirm(`Delete ${menu.name}?`)) {
      return;
    }

    setDeletingId(menu.id);
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/manager/system-menus/${menu.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).catch(() => null);

    setDeletingId(null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setError(typeof body?.message === "string" ? body.message : "Unable to delete system menu.");
      return;
    }

    if (form.id === menu.id) {
      closeForm();
    }

    setMessage("System menu deleted.");
    await loadMenus();
  }

  async function toggleMenu(menu: SystemMenuDto, key: "isVisible" | "isEnabled") {
    if (!menu.id) {
      return;
    }

    const token = localStorage.getItem("umika_access_token");

    if (!token) {
      setStatus("unauthenticated");
      return;
    }

    const payload: SystemMenuUpsertRequest = {
      parentId: menu.parentId,
      name: menu.name,
      code: menu.code,
      path: menu.path,
      component: menu.component,
      icon: menu.icon,
      menuType: menu.menuType,
      sortOrder: menu.sortOrder,
      isVisible: key === "isVisible" ? !(menu.isVisible ?? true) : menu.isVisible ?? true,
      isEnabled: key === "isEnabled" ? !(menu.isEnabled ?? true) : menu.isEnabled ?? true,
    };

    const response = await fetch(`/api/manager/system-menus/${menu.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }).catch(() => null);

    if (!response?.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setError(typeof body?.message === "string" ? body.message : "Unable to update menu state.");
      return;
    }

    setMessage("System menu updated.");
    await loadMenus();
  }

  if (status === "unauthenticated") {
    return (
      <Card className="rounded-md shadow-none">
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">{error ?? "Log in with an admin account to manage system menus."}</p>
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
          Add system menu
        </Button>
      </div>

      <div className={isFormVisible ? "grid gap-6 2xl:grid-cols-[430px_1fr]" : "grid gap-6"}>
        {isFormVisible ? (
          <Card className="rounded-md shadow-none">
            <CardHeader className="border-b border-slate-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{isEditing ? "Edit system menu" : "Add system menu"}</CardTitle>
                  <p className="mt-2 text-sm text-slate-500">These rows control admin navigation and role menu assignment.</p>
                </div>
                <Button onClick={closeForm} size="icon" type="button" variant="outline" aria-label="Close system menu form">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={(event) => void saveMenu(event)}>
                <Field label="Name" required>
                  <input className={inputClass} onChange={(event) => updateField("name", event.target.value)} required value={form.name} />
                </Field>
                <Field label="Code" required>
                  <input className={`${inputClass} font-mono uppercase`} onChange={(event) => updateField("code", event.target.value)} required value={form.code} />
                </Field>
                <Field label="Parent menu">
                  <select className={inputClass} onChange={(event) => updateField("parentId", event.target.value)} value={form.parentId}>
                    <option value="">Top level</option>
                    {parentOptions.map((menu) => (
                      <option key={menu.id ?? menu.code} value={menu.id ?? ""}>
                        {menu.name} ({menu.code})
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-1">
                  <Field label="Path">
                    <input className={inputClass} onChange={(event) => updateField("path", event.target.value)} placeholder="/manager/..." value={form.path} />
                  </Field>
                  <Field label="Component">
                    <input className={inputClass} onChange={(event) => updateField("component", event.target.value)} value={form.component} />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-3 2xl:grid-cols-1">
                  <Field label="Icon">
                    <input className={inputClass} onChange={(event) => updateField("icon", event.target.value)} value={form.icon} />
                  </Field>
                  <Field label="Menu type" required>
                    <input className={inputClass} onChange={(event) => updateField("menuType", event.target.value)} required value={form.menuType} />
                  </Field>
                  <Field label="Sort order">
                    <input className={inputClass} onChange={(event) => updateField("sortOrder", event.target.value)} type="number" value={form.sortOrder} />
                  </Field>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <CheckboxLabel checked={form.isVisible} label="Visible" onChange={(value) => updateField("isVisible", value)} />
                  <CheckboxLabel checked={form.isEnabled} label="Enabled" onChange={(value) => updateField("isEnabled", value)} />
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
                <div className="flex gap-2">
                  <Button className="flex-1" disabled={isSaving} type="submit">
                    {isEditing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {isSaving ? "Saving..." : isEditing ? "Update menu" : "Create menu"}
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
                <CardTitle className="text-base">System menu records</CardTitle>
                <p className="mt-2 text-sm text-slate-500">{menus.length} menu records loaded from backend.</p>
              </div>
              <Button disabled={status === "loading"} onClick={() => void loadMenus()} type="button" variant="outline">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {status === "loading" ? (
              <div className="p-5 text-sm text-slate-500">Loading system menus...</div>
            ) : menuTree.length === 0 ? (
              <div className="p-5 text-sm text-slate-500">No system menus yet. Add the first menu record.</div>
            ) : (
              <div className="overflow-x-auto">
                <div className="grid min-w-[1200px] grid-cols-[1.3fr_1fr_1.2fr_100px_150px_230px] border-b border-slate-200 bg-slate-100 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <span>Name</span>
                  <span>Code</span>
                  <span>Path</span>
                  <span>Order</span>
                  <span>State</span>
                  <span>Actions</span>
                </div>
                {menuTree.map((menu) => (
                  <SystemMenuTreeRow
                    deletingId={deletingId}
                    deleteMenu={deleteMenu}
                    depth={0}
                    key={menu.id ?? menu.code}
                    menu={menu}
                    selectMenu={selectMenu}
                    startCreateChild={startCreateChild}
                    toggleMenu={toggleMenu}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SystemMenuTreeRow({
  deletingId,
  deleteMenu,
  depth,
  menu,
  selectMenu,
  startCreateChild,
  toggleMenu,
}: {
  deletingId: string | null;
  deleteMenu: (menu: SystemMenuDto) => Promise<void>;
  depth: number;
  menu: SystemMenuNode;
  selectMenu: (menu: SystemMenuDto) => void;
  startCreateChild: (parent: SystemMenuDto) => void;
  toggleMenu: (menu: SystemMenuDto, key: "isVisible" | "isEnabled") => Promise<void>;
}) {
  return (
    <>
      <div className="grid min-w-[1200px] grid-cols-[1.3fr_1fr_1.2fr_100px_150px_230px] items-center border-b border-slate-200 px-5 py-4 last:border-b-0">
        <div className="flex min-w-0 items-center gap-3" style={{ paddingLeft: depth * 22 }}>
          {menu.children.length > 0 ? <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" /> : <span className="h-4 w-4 shrink-0" />}
          <ManagerIcon name={menu.icon ?? "LayoutDashboard"} className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-950">{menu.name}</p>
            <p className="truncate text-xs text-slate-500">{depth === 0 ? "Top level" : "Second layer"}</p>
          </div>
        </div>
        <span className="truncate font-mono text-xs font-semibold text-slate-600">{menu.code}</span>
        <span className="truncate font-mono text-xs text-slate-600">{menu.path ?? "none"}</span>
        <span className="text-sm font-semibold text-slate-900">{menu.sortOrder ?? 0}</span>
        <div className="flex flex-wrap gap-2">
          <StatusPill tone={menu.isEnabled === false ? "DISABLED" : "ACTIVE"}>{menu.isEnabled === false ? "DISABLED" : "ENABLED"}</StatusPill>
          <StatusPill tone={menu.isVisible === false ? "DISABLED" : "ACTIVE"}>{menu.isVisible === false ? "HIDDEN" : "VISIBLE"}</StatusPill>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => selectMenu(menu)} size="icon" type="button" variant="outline" aria-label={`Edit ${menu.name}`}>
            <Pencil className="h-4 w-4" />
          </Button>
          {depth === 0 ? (
            <Button onClick={() => startCreateChild(menu)} size="icon" type="button" variant="outline" aria-label={`Add child menu under ${menu.name}`}>
              <Plus className="h-4 w-4" />
            </Button>
          ) : null}
          <Button onClick={() => void toggleMenu(menu, "isVisible")} size="icon" type="button" variant="outline" aria-label={`Toggle visibility for ${menu.name}`}>
            {menu.isVisible === false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button
            disabled={deletingId === menu.id}
            onClick={() => void deleteMenu(menu)}
            size="icon"
            type="button"
            variant="outline"
            aria-label={`Delete ${menu.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {menu.children.map((child) => (
        <SystemMenuTreeRow
          deletingId={deletingId}
          deleteMenu={deleteMenu}
          depth={depth + 1}
          key={child.id ?? child.code}
          menu={child}
          selectMenu={selectMenu}
          startCreateChild={startCreateChild}
          toggleMenu={toggleMenu}
        />
      ))}
    </>
  );
}

function buildMenuTree(menus: SystemMenuDto[]): SystemMenuNode[] {
  const nodes = new Map<string, SystemMenuNode>();
  const roots: SystemMenuNode[] = [];

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

  function sortNodes(items: SystemMenuNode[]) {
    items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
    for (const item of items) {
      sortNodes(item.children);
    }
  }

  sortNodes(roots);
  return roots;
}

const inputClass = "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

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

function CheckboxLabel({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
      <input checked={checked} className="h-4 w-4 accent-primary" onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      {label}
    </label>
  );
}
