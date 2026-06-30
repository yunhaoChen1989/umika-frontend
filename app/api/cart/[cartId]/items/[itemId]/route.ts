import { NextResponse, type NextRequest } from "next/server";

import { backendBaseUrl, getAuthHeaders, proxyJsonResponse } from "@/lib/backend-proxy";

type RouteContext = {
  params: Promise<{ cartId: string; itemId: string }>;
};

function buildUrl(cartId: string, itemId: string, request: NextRequest) {
  const url = new URL(`${backendBaseUrl}/cart/${cartId}/items/${itemId}`);
  const sessionId = request.nextUrl.searchParams.get("sessionId");

  if (sessionId) {
    url.searchParams.set("sessionId", sessionId);
  }

  return url;
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { cartId, itemId } = await context.params;
  const headers = getAuthHeaders(request);
  headers.set("Content-Type", "application/json");

  const response = await fetch(buildUrl(cartId, itemId, request), {
    method: "PUT",
    headers,
    body: JSON.stringify(await request.json().catch(() => null)),
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    return NextResponse.json({ message: "Unable to reach the Umika API." }, { status: 503 });
  }

  return proxyJsonResponse(response);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { cartId, itemId } = await context.params;
  const response = await fetch(buildUrl(cartId, itemId, request), {
    method: "DELETE",
    headers: getAuthHeaders(request),
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    return NextResponse.json({ message: "Unable to reach the Umika API." }, { status: 503 });
  }

  return proxyJsonResponse(response);
}
