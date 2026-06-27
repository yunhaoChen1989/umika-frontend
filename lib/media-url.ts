const backendBaseUrl = (
  process.env.BACKEND_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080/api/v1"
).replace(/\/$/, "");

const backendOrigin = (() => {
  try {
    const url = new URL(backendBaseUrl);
    return url.origin;
  } catch {
    return "http://localhost:8080";
  }
})();

export function resolveBackendMediaUrl(value?: string | null) {
  if (!value) {
    return "";
  }

  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${backendOrigin}${value}`;
  }

  return `${backendOrigin}/${value.replace(/^\/+/, "")}`;
}
