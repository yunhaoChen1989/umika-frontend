import { NextResponse, type NextRequest } from "next/server";

import { backendBaseUrl, getAuthHeaders, proxyJsonResponse } from "@/lib/backend-proxy";

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await context.params;
  const headers = getAuthHeaders(request);
  headers.set("Content-Type", "application/json");

  const payload = await request.json().catch(() => null);

  if (!payload) {
    return NextResponse.json({ message: "A valid JSON body is required." }, { status: 400 });
  }

  const response = await fetch(`${backendBaseUrl}/orders/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    return NextResponse.json({ message: "Unable to reach the Umika API." }, { status: 503 });
  }

  return proxyJsonResponse(response);
}
