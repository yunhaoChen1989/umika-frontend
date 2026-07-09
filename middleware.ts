import { NextResponse, type NextRequest } from "next/server";

import { getLoginRedirectHref } from "@/lib/auth-redirect";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("umika_access_token")?.value;

  if (!token) {
    const redirectPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    return NextResponse.redirect(new URL(getLoginRedirectHref(redirectPath), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/manager/:path*"],
};
