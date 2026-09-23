import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

const backendBaseUrl = (
  process.env.MANAGER_API_BASE_URL ??
  process.env.BACKEND_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:2026/api/v1"
).replace(/\/$/, "");

export async function proxyManagerApi(request: NextRequest, path: string, method = request.method) {
  const authorization = request.headers.get("authorization");
  const cookieToken = (await cookies()).get("umika_access_token")?.value;
  const token = authorization?.replace(/^Bearer\s+/i, "") ?? cookieToken;

  if (!token) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  const url = new URL(`${backendBaseUrl}${path}`);
  request.nextUrl.searchParams.forEach((value, key) => url.searchParams.append(key, value));
  const hasBody = method !== "GET" && method !== "DELETE";
  const body = hasBody ? await request.text().catch(() => "") : undefined;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(hasBody ? { "Content-Type": request.headers.get("content-type") ?? "application/json" } : {}),
      ...(request.headers.get("accept-language") ? { "Accept-Language": request.headers.get("accept-language")! } : {}),
    },
    body,
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    return NextResponse.json({ message: "Unable to reach the Umika API." }, { status: 503 });
  }

  const responseBody = await response.text();
  return new NextResponse(responseBody || null, {
    status: response.status,
    headers: responseBody ? { "Content-Type": response.headers.get("content-type") ?? "application/json" } : undefined,
  });
}

