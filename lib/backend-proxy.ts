import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, resolveLocale } from "@/lib/i18n";

export const backendBaseUrl = (
  process.env.BACKEND_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:2026/api/v1"
).replace(/\/$/, "");

export function getAuthHeaders(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const cookieToken = request.cookies.get("umika_access_token")?.value;
  const token = authorization?.replace(/^Bearer\s+/i, "") ?? cookieToken;
  const headers = new Headers();
  const locale = resolveLocale(request.cookies.get("umika_locale")?.value ?? defaultLocale);

  headers.set("Accept-Language", locale === "zh" ? "zh-CN" : locale === "ko" ? "ko-KR" : "en-CA");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

export async function proxyJsonResponse(response: Response) {
  const body = await response.text();

  if (!body) {
    return new NextResponse(null, { status: response.status });
  }

  return new NextResponse(body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
      ...(response.headers.get("Content-Language") ? { "Content-Language": response.headers.get("Content-Language")! } : {}),
    },
  });
}
