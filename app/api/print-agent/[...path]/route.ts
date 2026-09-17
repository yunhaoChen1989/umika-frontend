import { NextResponse, type NextRequest } from "next/server";
import { backendBaseUrl, proxyJsonResponse } from "@/lib/backend-proxy";

// Separate machine authentication; no manager cookie or browser token is used here.
export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const joined = path.join("/");
  if (!/^(poll|configure|jobs\/[0-9a-f-]{36}\/(ack|reprint))$/i.test(joined)) return new NextResponse(null, { status: 404 });
  const key = request.headers.get("X-Print-Agent-Key");
  if (!key || key.length !== 43) return new NextResponse(null, { status: 401 });
  const body = await request.text();
  if (body.length > 10000) return new NextResponse(null, { status: 413 });
  const response = await fetch(`${backendBaseUrl}/print-agent/${joined}`, {
    method: "POST", cache: "no-store", signal: AbortSignal.timeout(7000), body,
    headers: { "Content-Type": "application/json", "X-Print-Agent-Key": key },
  }).catch(() => null);
  if (!response) return new NextResponse(null, { status: 503 });
  const result = await proxyJsonResponse(response);
  result.headers.set("Cache-Control", "no-store");
  return result;
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  if (path.join("/") !== "health") return new NextResponse(null, { status: 404 });
  const response = await fetch(`${backendBaseUrl}/print-agent/health`, { cache: "no-store", signal: AbortSignal.timeout(3000) }).catch(() => null);
  if (!response) return new NextResponse(null, { status: 503 });
  const result = await proxyJsonResponse(response);
  result.headers.set("Cache-Control", "no-store");
  return result;
}
