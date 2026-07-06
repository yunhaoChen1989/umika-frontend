import { NextResponse, type NextRequest } from "next/server";

import { backendBaseUrl, getAuthHeaders, proxyJsonResponse } from "@/lib/backend-proxy";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const payload = await request.json().catch(() => null);
  const response = await fetch(`${backendBaseUrl}/menu-recommendations/${encodeURIComponent(id)}`, {
    method: "PUT",
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

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const response = await fetch(`${backendBaseUrl}/menu-recommendations/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: getAuthHeaders(request),
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    return NextResponse.json({ message: "Unable to reach the Umika API." }, { status: 503 });
  }

  return proxyJsonResponse(response);
}
