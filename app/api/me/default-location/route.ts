import { NextResponse, type NextRequest } from "next/server";

const backendBaseUrl = (
  process.env.BACKEND_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:2026/api/v1"
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
  const response = await fetch(`${backendBaseUrl}/me/default-location`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
    signal: controller.signal,
  }).catch(() => null);
  clearTimeout(timeout);

  if (!response) {
    return NextResponse.json({ message: "Unable to reach the Umika API." }, { status: 503 });
  }

  if (!response.ok) {
    return NextResponse.json(
      {
        message:
          response.status === 401 || response.status === 403
            ? "Please log in again."
            : "Unable to load default location.",
      },
      { status: response.status },
    );
  }

  return NextResponse.json(await response.json());
}
