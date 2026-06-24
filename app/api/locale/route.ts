import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, resolveLocale } from "@/lib/i18n";

export function GET(request: NextRequest) {
  const locale = resolveLocale(request.nextUrl.searchParams.get("locale") ?? defaultLocale);
  const requestedNext = request.nextUrl.searchParams.get("next") ?? "/";
  const nextPath = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/";
  const redirectUrl = new URL(nextPath, request.url);
  const response = NextResponse.redirect(redirectUrl);

  response.cookies.set("umika_locale", locale, {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });

  return response;
}
