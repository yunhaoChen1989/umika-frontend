import { NextResponse, type NextRequest } from "next/server";

const backendBaseUrl = (
  process.env.BACKEND_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080/api/v1"
).replace(/\/$/, "");

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const locationId = requestUrl.searchParams.get("locationId")?.trim();
  const locationCode = requestUrl.searchParams.get("locationCode")?.trim();
  const backendUrl = new URL(`${backendBaseUrl}/locations/current`);

  if (locationId) {
    backendUrl.searchParams.set("locationId", locationId);
  }

  if (locationCode) {
    backendUrl.searchParams.set("locationCode", locationCode);
  }

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

  if (!response.ok) {
    return NextResponse.json({ message: "Unable to load location." }, { status: response.status });
  }

  return NextResponse.json(await response.json());
}
