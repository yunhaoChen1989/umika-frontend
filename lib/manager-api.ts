import { cookies } from "next/headers";

import { managerDashboard, managerPermissions, managerRoleAccess, managerUsers } from "@/lib/manager-data";
import { defaultLocale, type Locale } from "@/lib/i18n";
import type { ManagerMenu } from "@/lib/manager-types";

type BackendManagerMenu = {
  id?: string;
  parentId?: string | null;
  parent_id?: string | null;
  name?: string;
  description?: string | null;
  code?: string;
  path?: string;
  route?: string;
  component?: string;
  icon?: string;
  menuType?: string;
  menu_type?: string;
  sortOrder?: number;
  sort_order?: number;
  isVisible?: boolean;
  is_visible?: boolean;
  isEnabled?: boolean;
  is_enabled?: boolean;
  permission?: string;
  permissionCode?: string;
  permission_code?: string;
  children?: BackendManagerMenu[];
};

type BackendManagerMenusResponse =
  | BackendManagerMenu[]
  | {
      menus?: BackendManagerMenu[];
      data?: BackendManagerMenu[];
      items?: BackendManagerMenu[];
      content?: BackendManagerMenu[];
    };

const managerApiBaseUrl = (
  process.env.MANAGER_API_BASE_URL ??
  process.env.BACKEND_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080/api/v1"
).replace(/\/$/, "");

function getResponseMenus(payload: BackendManagerMenusResponse): BackendManagerMenu[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.menus ?? payload.data ?? payload.items ?? payload.content ?? [];
}

function normalizeManagerMenu(menu: BackendManagerMenu): ManagerMenu | null {
  if (!menu.name || !menu.code || menu.isVisible === false || menu.is_visible === false || menu.isEnabled === false || menu.is_enabled === false) {
    return null;
  }

  return {
    id: menu.id ?? menu.code,
    name: menu.name,
    description: menu.description ?? null,
    code: menu.code,
    path: menu.path ?? menu.route ?? "/manager",
    icon: menu.icon ?? "LayoutDashboard",
    sortOrder: menu.sortOrder ?? menu.sort_order ?? 0,
    permission: menu.permission ?? menu.permissionCode ?? menu.permission_code,
    children: sortManagerMenus(menu.children?.map(normalizeManagerMenu).filter((child): child is ManagerMenu => Boolean(child)) ?? []),
  };
}

function sortManagerMenus(menus: ManagerMenu[]) {
  return [...menus].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

function buildMenuTree(flatMenus: BackendManagerMenu[]) {
  const visibleMenus = flatMenus.filter(
    (menu) => menu.isVisible !== false && menu.is_visible !== false && menu.isEnabled !== false && menu.is_enabled !== false,
  );
  const childrenByParentId = new Map<string, BackendManagerMenu[]>();
  const roots: BackendManagerMenu[] = [];

  for (const menu of visibleMenus) {
    const parentId = menu.parentId ?? menu.parent_id;

    if (parentId) {
      childrenByParentId.set(parentId, [...(childrenByParentId.get(parentId) ?? []), menu]);
    } else {
      roots.push(menu);
    }
  }

  function attachChildren(menu: BackendManagerMenu): BackendManagerMenu {
    const id = menu.id ?? menu.code;
    const existingChildren = menu.children ?? [];
    const flatChildren = id ? childrenByParentId.get(id) ?? [] : [];
    const childMap = new Map<string, BackendManagerMenu>();

    for (const child of [...existingChildren, ...flatChildren]) {
      childMap.set(child.id ?? child.code ?? child.name ?? String(childMap.size), child);
    }

    return {
      ...menu,
      children: [...childMap.values()].map(attachChildren),
    };
  }

  return roots.map(attachChildren);
}

async function getManagerAccessToken() {
  const store = await cookies();
  return store.get("umika_access_token")?.value;
}

export async function getManagerDashboard() {
  return managerDashboard;
}

export async function getManagerMenus(locale: Locale = defaultLocale) {
  const token = await getManagerAccessToken();

  if (!token) {
    return [];
  }

  const url = new URL(`${managerApiBaseUrl}/manager/menus`);
  url.searchParams.set("locale", locale);
  url.searchParams.set("page", "0");
  url.searchParams.set("size", "200");
  url.searchParams.set("sort", "sortOrder,asc");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
    signal: controller.signal,
  }).catch(() => null);
  clearTimeout(timeout);

  if (!response?.ok) {
    return [];
  }

  const payload = (await response.json()) as BackendManagerMenusResponse;
  const backendMenus = getResponseMenus(payload);
  const sourceMenus = backendMenus.some((menu) => menu.parentId || menu.parent_id) ? buildMenuTree(backendMenus) : backendMenus;
  const menus = sourceMenus
    .map(normalizeManagerMenu)
    .filter((menu): menu is ManagerMenu => Boolean(menu))
    .map((menu) => ({
      ...menu,
      children: sortManagerMenus(menu.children ?? []),
    }));

  const sortedMenus = sortManagerMenus(menus);

  return sortedMenus;
}

export async function getManagerPermissions() {
  return managerPermissions;
}

export async function getManagerRoleAccess() {
  return managerRoleAccess;
}

export async function getManagerUsers() {
  return managerUsers;
}
