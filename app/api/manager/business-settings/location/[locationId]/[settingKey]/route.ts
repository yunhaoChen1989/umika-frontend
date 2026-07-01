import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

const backendBaseUrl = (
  process.env.MANAGER_API_BASE_URL ??
  process.env.BACKEND_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080/api/v1"
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

export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{ locationId: string; settingKey: string }>;
  },
) {
  const token = await getToken(request);

  if (!token) {
    return authError();
  }

  const { locationId, settingKey } = await context.params;
  const response = await fetch(
    `${backendBaseUrl}/business-settings/location/${encodeURIComponent(locationId)}/${encodeURIComponent(settingKey)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  ).catch(() => null);

  if (!response) {
    return NextResponse.json({ message: "Unable to reach the Umika API." }, { status: 503 });
  }

  return proxyJsonResponse(response);
}
