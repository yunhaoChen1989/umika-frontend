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

function authError() {
  return NextResponse.json({ message: "Authentication required." }, { status: 401 });
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

  if (!token) {
    return authError();
  }

  const url = new URL(`${backendBaseUrl}/system-settings`);
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    return NextResponse.json({ message: "Unable to reach the Umika API." }, { status: 503 });
  }

  return proxyJsonResponse(response);
}

export async function POST(request: NextRequest) {
  const token = await getToken(request);

  if (!token) {
    return authError();
  }

  const payload = await request.json().catch(() => null);
  const response = await fetch(`${backendBaseUrl}/system-settings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
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
