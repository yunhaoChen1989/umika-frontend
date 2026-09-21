import { NextResponse, type NextRequest } from "next/server";
import { backendBaseUrl, getAuthHeaders, proxyJsonResponse } from "@/lib/backend-proxy";

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const joined = path.join("/");
  if (!/^[0-9a-f-]{36}(?:\/pair|\/routing|\/receipt-template|\/orders\/[0-9a-f-]{36}\/reprint|\/jobs(?:\/[0-9a-f-]{36}\/reprint)?)?$/i.test(joined)) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const headers = getAuthHeaders(request);
  headers.set("Content-Type", "application/json");
  if (!headers.has("Authorization")) return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  const response = await fetch(`${backendBaseUrl}/manager/printing/${joined}`, {
    method: request.method, headers, cache: "no-store", signal: AbortSignal.timeout(10000),
    ...(request.method !== "GET" ? { body: await request.text() } : {}),
  }).catch(() => null);
  if (!response) return NextResponse.json({ message: "PRINT_SERVER_UNREACHABLE" }, { status: 503 });
  const result = await proxyJsonResponse(response);
  result.headers.set("Cache-Control", "no-store");
  return result;
}
export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
