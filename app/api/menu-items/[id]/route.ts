import { NextResponse, type NextRequest } from "next/server";

import { backendBaseUrl, getAuthHeaders, proxyJsonResponse } from "@/lib/backend-proxy";

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await context.params;
  const response = await fetch(`${backendBaseUrl}/menu-items/${id}`, {
    method: "GET",
    headers: getAuthHeaders(request),
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    return NextResponse.json({ message: "Unable to reach the Umika API." }, { status: 503 });
  }

  return proxyJsonResponse(response);
}
