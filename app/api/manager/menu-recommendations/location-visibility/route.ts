import { NextResponse, type NextRequest } from "next/server";

import { backendBaseUrl, getAuthHeaders, proxyJsonResponse } from "@/lib/backend-proxy";

export async function PATCH(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const response = await fetch(`${backendBaseUrl}/menu-recommendations/location-visibility`, {
    method: "PATCH",
    headers: {
      ...Object.fromEntries(getAuthHeaders(request)),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    return NextResponse.json({ message: "Unable to reach the Umika API." }, { status: 503 });
  }

  return proxyJsonResponse(response);
}
