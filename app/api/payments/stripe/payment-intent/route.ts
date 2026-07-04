import { NextResponse, type NextRequest } from "next/server";

import { backendBaseUrl, getAuthHeaders, proxyJsonResponse } from "@/lib/backend-proxy";

export async function POST(request: NextRequest) {
  const headers = getAuthHeaders(request);
  headers.set("Content-Type", "application/json");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  const response = await fetch(`${backendBaseUrl}/payments/stripe/payment-intent`, {
    method: "POST",
    headers,
    body: JSON.stringify(await request.json().catch(() => null)),
    cache: "no-store",
    signal: controller.signal,
  }).catch(() => null);
  clearTimeout(timeout);

  if (!response) {
    return NextResponse.json({ message: "Unable to prepare payment. Please try again." }, { status: 504 });
  }

  return proxyJsonResponse(response);
}
