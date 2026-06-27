import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const backendBaseUrl = (
  process.env.BACKEND_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080/api/v1"
).replace(/\/$/, "");

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ message: "Location id is required." }, { status: 400 });
  }

  const authorization = request.headers.get("authorization");
  const cookieToken = request.cookies.get("umika_access_token")?.value;
  const token = authorization?.replace(/^Bearer\s+/i, "") ?? cookieToken;
  const headers = new Headers();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${backendBaseUrl}/locations/${id}`, {
    method: "GET",
    headers,
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    return NextResponse.json({ message: "Unable to reach the Umika API." }, { status: 503 });
  }

  if (!response.ok) {
    return NextResponse.json({ message: "Unable to load location." }, { status: response.status });
  }

  return NextResponse.json(await response.json());
}
