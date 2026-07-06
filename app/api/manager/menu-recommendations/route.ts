import { NextResponse, type NextRequest } from "next/server";

import { backendBaseUrl, getAuthHeaders, proxyJsonResponse } from "@/lib/backend-proxy";

export async function GET(request: NextRequest) {
  const url = new URL(`${backendBaseUrl}/menu-recommendations/manage`);
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(request),
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    return NextResponse.json({ message: "Unable to reach the Umika API." }, { status: 503 });
  }

  return proxyJsonResponse(response);
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const response = await fetch(`${backendBaseUrl}/menu-recommendations`, {
    method: "POST",
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
