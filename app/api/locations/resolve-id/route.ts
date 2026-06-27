import { NextResponse, type NextRequest } from "next/server";

const backendBaseUrl = (
  process.env.BACKEND_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080/api/v1"
).replace(/\/$/, "");

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const locationCode = requestUrl.searchParams.get("locationCode")?.trim();

  if (!locationCode) {
    return NextResponse.json({ message: "locationCode is required." }, { status: 400 });
  }

  const backendUrl = new URL(`${backendBaseUrl}/locations/resolve-id`);
  backendUrl.searchParams.set("locationCode", locationCode);

  const authorization = request.headers.get("authorization");
  const cookieToken = request.cookies.get("umika_access_token")?.value;
  const token = authorization?.replace(/^Bearer\s+/i, "") ?? cookieToken;
  const headers = new Headers();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(backendUrl, {
    method: "GET",
    headers,
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    return NextResponse.json({ message: "Unable to reach the Umika API." }, { status: 503 });
  }

  const body = await response.text();

  if (!response.ok) {
    return new NextResponse(body || JSON.stringify({ message: "Unable to resolve location." }), {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "application/json",
      },
    });
  }

  const contentType = response.headers.get("Content-Type") ?? "";

  if (contentType.includes("application/json")) {
    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  return NextResponse.json({ locationId: body.trim() });
}
