import { NextResponse, type NextRequest } from "next/server";

import { shouldUseSecureAuthCookie, type BackendAuthResponse, unwrapAuthResponse } from "@/lib/auth-session";

const backendBaseUrl = (
  process.env.BACKEND_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080/api/v1"
).replace(/\/$/, "");

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const email = typeof payload?.email === "string" ? payload.email.trim() : "";
  const password = typeof payload?.password === "string" ? payload.password : "";

  if (!email || !password) {
    return NextResponse.json({ message: "Email and password are required." }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  const backendResponse = await fetch(`${backendBaseUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
    signal: controller.signal,
  }).catch(() => null);
  clearTimeout(timeout);

  if (!backendResponse) {
    return NextResponse.json({ message: "Unable to reach the Umika API." }, { status: 503 });
  }

  if (!backendResponse.ok) {
    return NextResponse.json(
      { message: backendResponse.status === 401 ? "Invalid email or password." : "Login failed. Please try again." },
      { status: backendResponse.status },
    );
  }

  const data = unwrapAuthResponse((await backendResponse.json()) as BackendAuthResponse);

  if (!data?.accessToken) {
    return NextResponse.json({ message: "Login response did not include an access token." }, { status: 502 });
  }

  const accessToken = data.accessToken;
  const response = NextResponse.json({
    authenticated: true,
    accessToken,
    tokenType: data.tokenType ?? "Bearer",
  });
  response.cookies.set("umika_access_token", accessToken, {
    httpOnly: true,
    maxAge: 60 * 60,
    path: "/",
    sameSite: "lax",
    secure: shouldUseSecureAuthCookie(request),
  });

  return response;
}
