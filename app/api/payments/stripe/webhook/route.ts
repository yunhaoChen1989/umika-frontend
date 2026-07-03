import { NextResponse, type NextRequest } from "next/server";

import { backendBaseUrl, proxyJsonResponse } from "@/lib/backend-proxy";

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const headers = new Headers();
  const signature = request.headers.get("stripe-signature");

  headers.set("Content-Type", "application/json");
  if (signature) {
    headers.set("Stripe-Signature", signature);
  }

  const response = await fetch(`${backendBaseUrl}/payments/stripe/webhook`, {
    method: "POST",
    headers,
    body: payload,
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    return NextResponse.json({ message: "Unable to reach the Umika API." }, { status: 503 });
  }

  return proxyJsonResponse(response);
}
