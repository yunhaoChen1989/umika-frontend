export const defaultPostLoginPath = "/account";

export function getSafeRedirectPath(value: string | string[] | null | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (!rawValue) {
    return defaultPostLoginPath;
  }

  if (!rawValue.startsWith("/") || rawValue.startsWith("//")) {
    return defaultPostLoginPath;
  }

  if (rawValue === "/login" || rawValue.startsWith("/login?")) {
    return defaultPostLoginPath;
  }

  return rawValue;
}

export function getLoginRedirectHref(path: string) {
  const redirectPath = getSafeRedirectPath(path);
  return `/login?redirect=${encodeURIComponent(redirectPath)}`;
}
