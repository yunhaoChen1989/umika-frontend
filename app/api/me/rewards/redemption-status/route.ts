import { NextResponse, type NextRequest } from "next/server";

import { backendBaseUrl, getAuthHeaders, proxyJsonResponse } from "@/lib/backend-proxy";

export async function GET(request: NextRequest) {
  const headers = getAuthHeaders(request);

  if (!headers.has("Authorization")) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  const backendUrl = new URL(`${backendBaseUrl}/me/rewards/redemption-status`);
  const locationId = request.nextUrl.searchParams.get("locationId");
  const locationCode = request.nextUrl.searchParams.get("locationCode");

  if (locationId) {
    backendUrl.searchParams.set("locationId", locationId);
  } else if (locationCode) {
    const resolveUrl = new URL(`${backendBaseUrl}/locations/resolve-id`);
    resolveUrl.searchParams.set("locationCode", locationCode);

    const resolveResponse = await fetch(resolveUrl.toString(), {
      method: "GET",
      headers,
      cache: "no-store",
    }).catch(() => null);

    if (!resolveResponse) {
      return NextResponse.json({ message: "Unable to reach the Umika API." }, { status: 503 });
    }

    if (!resolveResponse.ok) {
      return proxyJsonResponse(resolveResponse);
    }

    const contentType = resolveResponse.headers.get("Content-Type") ?? "";

    if (contentType.includes("application/json")) {
      const body = await resolveResponse.json().catch(() => null);
      const resolvedLocationId = typeof body?.locationId === "string" ? body.locationId : typeof body?.id === "string" ? body.id : "";

      if (resolvedLocationId) {
        backendUrl.searchParams.set("locationId", resolvedLocationId);
      }
    } else {
      const resolvedLocationId = (await resolveResponse.text()).trim();

      if (resolvedLocationId) {
        backendUrl.searchParams.set("locationId", resolvedLocationId);
      }
    }
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
