import { NextResponse, type NextRequest } from "next/server";

import { backendBaseUrl, getAuthHeaders, proxyJsonResponse } from "@/lib/backend-proxy";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const response = await fetch(`${backendBaseUrl}/manager/coupons/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: getAuthHeaders(request),
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    return NextResponse.json({ message: "Unable to reach the Umika API." }, { status: 503 });
  }

  return proxyJsonResponse(response);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const headers = getAuthHeaders(request);
  headers.set("Content-Type", "application/json");

  const response = await fetch(`${backendBaseUrl}/manager/coupons/${encodeURIComponent(id)}`, {
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
