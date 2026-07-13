import { NextResponse, type NextRequest } from "next/server";

import { backendBaseUrl, getAuthHeaders, proxyJsonResponse } from "@/lib/backend-proxy";

type RouteContext = {
  params: Promise<{ cartId: string }>;
};

function withSessionId(request: NextRequest, url: URL) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");

  if (sessionId) {
    url.searchParams.set("sessionId", sessionId);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { cartId } = await context.params;
  const url = new URL(`${backendBaseUrl}/cart/${encodeURIComponent(cartId)}/coupon`);
  withSessionId(request, url);

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

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { cartId } = await context.params;
  const url = new URL(`${backendBaseUrl}/cart/${encodeURIComponent(cartId)}/coupon`);
  withSessionId(request, url);

  const response = await fetch(url, {
    method: "DELETE",
    headers: getAuthHeaders(request),
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    return NextResponse.json({ message: "Unable to reach the Umika API." }, { status: 503 });
  }

  return proxyJsonResponse(response);
}
