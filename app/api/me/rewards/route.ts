import { NextResponse, type NextRequest } from "next/server";

import { backendBaseUrl, getAuthHeaders, proxyJsonResponse } from "@/lib/backend-proxy";

export async function GET(request: NextRequest) {
  const headers = getAuthHeaders(request);

  if (!headers.has("Authorization")) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  const backendUrl = new URL(`${backendBaseUrl}/me/rewards`);
  const locationId = request.nextUrl.searchParams.get("locationId");
  const locationCode = request.nextUrl.searchParams.get("locationCode");

  if (locationId) {
    backendUrl.searchParams.set("locationId", locationId);
  }

  if (locationCode) {
    backendUrl.searchParams.set("locationCode", locationCode);
  }

  const response = await fetch(backendUrl.toString(), {
    method: "GET",
    headers,
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    return NextResponse.json({ message: "Unable to reach the Umika API." }, { status: 503 });
  }

  return proxyJsonResponse(response);
}
