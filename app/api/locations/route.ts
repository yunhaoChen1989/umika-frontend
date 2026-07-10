import { NextResponse, type NextRequest } from "next/server";

const backendBaseUrl = (
  process.env.BACKEND_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:2026/api/v1"
).replace(/\/$/, "");

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
  const url = new URL(`${backendBaseUrl}/locations`);
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  const authorization = request.headers.get("authorization");
  const cookieToken = request.cookies.get("umika_access_token")?.value;
  const token = authorization?.replace(/^Bearer\s+/i, "") ?? cookieToken;
  const headers = new Headers();

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
