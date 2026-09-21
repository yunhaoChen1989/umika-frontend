import { NextResponse, type NextRequest } from "next/server";

import {
  AUTH_COOKIE_MAX_AGE_SECONDS,
  shouldUseSecureAuthCookie,
  type BackendAuthResponse,
  unwrapAuthResponse,
} from "@/lib/auth-session";

const backendBaseUrl = (
  process.env.BACKEND_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:2026/api/v1"
).replace(/\/$/, "");

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const email = typeof payload?.email === "string" ? payload.email.trim() : "";
  const phone = typeof payload?.phone === "string" ? payload.phone.trim() : "";
  const password = typeof payload?.password === "string" ? payload.password : "";
  const firstName = typeof payload?.firstName === "string" ? payload.firstName.trim() : "";
  const lastName = typeof payload?.lastName === "string" ? payload.lastName.trim() : "";
  const preferredLanguage = typeof payload?.preferredLanguage === "string" ? payload.preferredLanguage.trim() : "";
  const referralCode = typeof payload?.referralCode === "string" ? payload.referralCode.trim() : "";
  const verificationCode = typeof payload?.verificationCode === "string" ? payload.verificationCode.trim() : "";

  if (!email || !password || !verificationCode) {
    return NextResponse.json({ code: "MISSING_REQUIRED_FIELDS" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ message: "Password must be at least 8 characters." }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  const backendResponse = await fetch(`${backendBaseUrl}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      phone: phone || null,
      password,
      firstName: firstName || null,
      lastName: lastName || null,
      preferredLanguage: preferredLanguage || null,
      referralCode: referralCode || null,
      verificationCode,
    }),
    cache: "no-store",
    signal: controller.signal,
  }).catch(() => null);
  clearTimeout(timeout);

  if (!backendResponse) {
    return NextResponse.json({ message: "Unable to reach the Umika API." }, { status: 503 });
  }

  if (!backendResponse.ok) {
    const body = await backendResponse.json().catch(() => null);
    const message =
      typeof body?.error?.message === "string"
        ? body.error.message
        : typeof body?.message === "string"
          ? body.message
          : "";
    const code =
      backendResponse.status === 409
        ? "EMAIL_EXISTS"
        : message.toLowerCase().includes("verification code")
          ? "INVALID_VERIFICATION_CODE"
          : "REGISTRATION_FAILED";
    return NextResponse.json(
      { code },
      { status: backendResponse.status },
    );
  }

  const data = unwrapAuthResponse((await backendResponse.json()) as BackendAuthResponse);

  if (!data?.accessToken) {
    return NextResponse.json({ message: "Registration response did not include an access token." }, { status: 502 });
  }

  const accessToken = data.accessToken;
  const response = NextResponse.json({
    authenticated: true,
    accessToken,
    tokenType: data.tokenType ?? "Bearer",
  });
  response.cookies.set("umika_access_token", accessToken, {
    httpOnly: true,
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: shouldUseSecureAuthCookie(request),
  });

  return response;
}
