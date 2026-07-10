import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

const backendBaseUrl = (
  process.env.MANAGER_API_BASE_URL ??
  process.env.BACKEND_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:2026/api/v1"
).replace(/\/$/, "");

async function getToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const cookieToken = (await cookies()).get("umika_access_token")?.value;
  return authorization?.replace(/^Bearer\s+/i, "") ?? cookieToken;
}

async function proxyJsonResponse(response: Response) {
  const body = await response.text();

  if (!body) {
    return new NextResponse(null, { status: response.status });
  }

  return new NextResponse(body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
    },
  });
}

export async function GET(request: NextRequest) {
  const token = await getToken(request);
  const headers = new Headers();

  const url = new URL(`${backendBaseUrl}/admin/system-menus`);
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    return NextResponse.json({ message: "Unable to reach the Umika API." }, { status: 503 });
  }

  return proxyJsonResponse(response);
}

export async function POST(request: NextRequest) {
  const token = await getToken(request);
  const headers = new Headers();
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const payload = await request.json().catch(() => null);
  const response = await fetch(`${backendBaseUrl}/admin/system-menus`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    return NextResponse.json({ message: "Unable to reach the Umika API." }, { status: 503 });
  }

  return proxyJsonResponse(response);
}
