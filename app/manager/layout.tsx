import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ManagerShell } from "@/components/manager/manager-shell";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getManagerMenus } from "@/lib/manager-api";

type ManagerProfile = {
  role?: string | null;
  roles?: string[] | null;
};

type ApiEnvelope<T> = {
  data?: T | null;
};

const managerRoles = new Set(["ADMIN", "MANAGER", "STAFF", "ROLE_ADMIN", "ROLE_MANAGER", "ROLE_STAFF"]);

const backendBaseUrl = (
  process.env.BACKEND_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080/api/v1"
).replace(/\/$/, "");

export default async function ManagerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getCurrentLocale();
  await requireManagerAccess();
  const menus = await getManagerMenus(locale);

  return <ManagerShell menus={menus} locale={locale}>{children}</ManagerShell>;
}

async function requireManagerAccess() {
  const store = await cookies();
  const token = store.get("umika_access_token")?.value;

  if (!token) {
    redirect("/login?redirect=%2Fmanager");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  const response = await fetch(`${backendBaseUrl}/me/profile`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
    signal: controller.signal,
  }).catch(() => null);
  clearTimeout(timeout);

  if (!response?.ok) {
    redirect("/login?redirect=%2Fmanager");
  }

  const payload = (await response.json().catch(() => null)) as ManagerProfile | ApiEnvelope<ManagerProfile> | null;
  const profile = resolveProfile(payload);
  const roles = [...(profile?.roles ?? []), profile?.role]
    .filter((role): role is string => Boolean(role))
    .map((role) => role.toUpperCase());

  if (!roles.some((role) => managerRoles.has(role))) {
    redirect("/");
  }
}

function resolveProfile(payload: ManagerProfile | ApiEnvelope<ManagerProfile> | null) {
  if (!payload) {
    return null;
  }

  if ("data" in payload && payload.data) {
    return payload.data;
  }

  return payload as ManagerProfile;
}
