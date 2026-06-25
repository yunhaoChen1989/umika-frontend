import { NextResponse, type NextRequest } from "next/server";

const backendBaseUrl = (
  process.env.BACKEND_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080/api/v1"
).replace(/\/$/, "");

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const cookieToken = request.cookies.get("umika_access_token")?.value;
  const token = authorization?.replace(/^Bearer\s+/i, "") ?? cookieToken;

  if (!token) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  const backendResponse = await fetch(`${backendBaseUrl}/me/profile`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
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
          backendResponse.status === 401 || backendResponse.status === 403
            ? "Please log in again."
            : "Unable to load account profile.",
      },
      { status: backendResponse.status },
    );
  }

  return NextResponse.json(await backendResponse.json());
}

export async function PATCH(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const cookieToken = request.cookies.get("umika_access_token")?.value;
  const token = authorization?.replace(/^Bearer\s+/i, "") ?? cookieToken;

  if (!token) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  const backendResponse = await fetch(`${backendBaseUrl}/me/profile`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
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
          backendResponse.status === 401 || backendResponse.status === 403
            ? "Please log in again."
            : "Unable to update account profile.",
      },
      { status: backendResponse.status },
    );
  }

  return NextResponse.json(await backendResponse.json());
}
