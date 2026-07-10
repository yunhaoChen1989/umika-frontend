import { NextResponse, type NextRequest } from "next/server";

const managerRoles = new Set(["ROLE_STAFF", "ROLE_MANAGER", "ROLE_ADMIN", "STAFF", "MANAGER", "ADMIN"]);

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("umika_access_token")?.value;
  const redirectTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", redirectTo);

  if (!token) {
    return NextResponse.redirect(loginUrl);
  }

  const profileUrl = new URL("/api/me/profile", request.url);
  const profileResponse = await fetch(profileUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  }).catch(() => null);

  if (!profileResponse?.ok) {
    return NextResponse.redirect(loginUrl);
  }

  const payload = await profileResponse.json().catch(() => null);
  const profile = payload?.data ?? payload;
  const roles = [...(Array.isArray(profile?.roles) ? profile.roles : []), profile?.role]
    .filter((role): role is string => typeof role === "string")
    .map((role) => role.toUpperCase());

  if (!roles.some((role) => managerRoles.has(role))) {
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/manager/:path*", "/admin/:path*"],
};
