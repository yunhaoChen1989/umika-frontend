import { NextResponse, type NextRequest } from "next/server";

import { shouldUseSecureAuthCookie, type BackendAuthResponse, unwrapAuthResponse } from "@/lib/auth-session";

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

  if (!email || !password) {
    return NextResponse.json({ message: "Email and password are required." }, { status: 400 });
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
    }),
    cache: "no-store",
    signal: controller.signal,
  }).catch(() => null);
  clearTimeout(timeout);

  if (!backendResponse) {
    return NextResponse.json({ message: "Unable to reach the Umika API." }, { status: 503 });
  }

  if (!backendResponse.ok) {
    return NextResponse.json(
      {
        message:
          backendResponse.status === 409
            ? "An account with this email already exists."
            : "Registration failed. Please try again.",
      },
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
    maxAge: 60 * 60,
    path: "/",
    sameSite: "lax",
    secure: shouldUseSecureAuthCookie(request),
  });

  return response;
}
