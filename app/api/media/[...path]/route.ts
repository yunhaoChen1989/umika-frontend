import { NextResponse, type NextRequest } from "next/server";

import { backendBaseUrl } from "@/lib/backend-proxy";

const backendOrigin = new URL(backendBaseUrl).origin;

export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{ path: string[] }>;
  },
) {
  const { path } = await context.params;
  const mediaPath = path.join("/");

  if (!mediaPath || path.some((part) => part === "..") || !mediaPath.startsWith("uploads/")) {
    return NextResponse.json({ message: "Invalid media path." }, { status: 400 });
  }

  const response = await fetch(`${backendOrigin}/${mediaPath}`, {
    method: "GET",
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    return NextResponse.json({ message: "Unable to reach the Umika media server." }, { status: 503 });
  }

  if (!response.ok || !response.body) {
    return new NextResponse(null, { status: response.status });
  }

  const headers = new Headers();
  const contentType = response.headers.get("Content-Type");
  const contentLength = response.headers.get("Content-Length");
  const cacheControl = response.headers.get("Cache-Control");

  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  if (contentLength) {
    headers.set("Content-Length", contentLength);
  }

  headers.set("Cache-Control", cacheControl ?? "public, max-age=86400");

  return new NextResponse(response.body, {
    status: response.status,
    headers,
  });
}
