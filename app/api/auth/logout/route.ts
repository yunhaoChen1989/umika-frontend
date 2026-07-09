import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { shouldUseSecureAuthCookie } from "@/lib/auth-session";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("umika_access_token", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
    sameSite: "lax",
    secure: shouldUseSecureAuthCookie(request),
  });
  return response;
}

export async function DELETE(request: NextRequest) {
  return POST(request);
}
