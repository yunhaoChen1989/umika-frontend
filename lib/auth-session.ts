import type { NextRequest } from "next/server";

export type BackendAuthResponse = {
  accessToken?: string;
  tokenType?: string;
  data?: BackendAuthResponse | null;
};

export function unwrapAuthResponse(payload: BackendAuthResponse | null): BackendAuthResponse | null {
  if (payload?.accessToken) {
    return payload;
  }

  if (payload?.data?.accessToken) {
    return payload.data;
  }

  return payload;
}

export function shouldUseSecureAuthCookie(request: NextRequest) {
  const override = process.env.AUTH_COOKIE_SECURE;

  if (override === "false") {
    return false;
  }

  if (override === "true") {
    return true;
  }

  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  return request.nextUrl.protocol === "https:" || forwardedProto === "https";
}
