import { NextResponse, type NextRequest } from "next/server";

import { backendBaseUrl, getAuthHeaders, proxyJsonResponse } from "@/lib/backend-proxy";

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ cartId: string }>;
  },
) {
  const { cartId } = await context.params;
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  const url = new URL(`${backendBaseUrl}/cart/${cartId}/items`);

  if (sessionId) {
    url.searchParams.set("sessionId", sessionId);
  }

  const headers = getAuthHeaders(request);
  headers.set("Content-Type", "application/json");

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(await request.json().catch(() => null)),
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    return NextResponse.json({ message: "Unable to reach the Umika API." }, { status: 503 });
  }

  return proxyJsonResponse(response);
}
