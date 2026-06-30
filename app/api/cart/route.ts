import { NextResponse, type NextRequest } from "next/server";

import { backendBaseUrl, getAuthHeaders, proxyJsonResponse } from "@/lib/backend-proxy";

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const headers = getAuthHeaders(request);
  headers.set("Content-Type", "application/json");

  const response = await fetch(`${backendBaseUrl}/cart`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    return NextResponse.json({ message: "Unable to reach the Umika API." }, { status: 503 });
  }

  return proxyJsonResponse(response);
}
