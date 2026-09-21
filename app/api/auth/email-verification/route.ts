import { NextResponse, type NextRequest } from "next/server";

const backendBaseUrl = (
  process.env.BACKEND_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:2026/api/v1"
).replace(/\/$/, "");

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const email = typeof payload?.email === "string" ? payload.email.trim() : "";
  const preferredLanguage =
    typeof payload?.preferredLanguage === "string" ? payload.preferredLanguage.trim() : "";

  if (!email) {
    return NextResponse.json({ code: "EMAIL_REQUIRED" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const requesterIp =
    request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (requesterIp) headers["X-Forwarded-For"] = requesterIp;
  const backendResponse = await fetch(`${backendBaseUrl}/auth/email-verification/send`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, preferredLanguage: preferredLanguage || null }),
    cache: "no-store",
    signal: controller.signal,
  }).catch(() => null);
  clearTimeout(timeout);

  if (!backendResponse) {
    return NextResponse.json({ code: "SEND_FAILED" }, { status: 503 });
  }
  if (!backendResponse.ok) {
    const code =
      backendResponse.status === 409
        ? "EMAIL_EXISTS"
        : backendResponse.status === 429
          ? "RATE_LIMITED"
          : "SEND_FAILED";
    return NextResponse.json({ code }, { status: backendResponse.status });
  }

  return NextResponse.json(await backendResponse.json());
}
