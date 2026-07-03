const backendOrigin = (() => {
  const configuredUrl =
    process.env.NEXT_PUBLIC_BACKEND_ORIGIN ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.BACKEND_API_BASE_URL ??
    process.env.MANAGER_API_BASE_URL;

  try {
    if (configuredUrl) {
      return new URL(configuredUrl.replace(/\/$/, "")).origin;
    }
  } catch {
    // Fall through to runtime defaults.
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname, origin } = window.location;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//${hostname}:8080`;
    }

    return origin;
  }

  return "http://localhost:8080";
})();

export function resolveBackendMediaUrl(value?: string | null) {
  const rawValue = value?.trim();

  if (!rawValue) {
    return "";
  }

  if (/^https?:\/\//i.test(rawValue) || rawValue.startsWith("data:") || rawValue.startsWith("blob:")) {
    return rawValue;
  }

  const mediaPath = rawValue
    .replace(/^\/?api\/v\d+\//i, "")
    .replace(/^\/+/, "");

  if (!mediaPath) {
    return "";
  }

  return `${backendOrigin}/${mediaPath}`;
}
