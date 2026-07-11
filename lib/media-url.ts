export function resolveBackendMediaUrl(value?: string | null) {
  const rawValue = value?.trim();

  if (!rawValue) {
    return "";
  }

  if (rawValue.startsWith("data:") || rawValue.startsWith("blob:")) {
    return rawValue;
  }

  const mediaPath = normalizeMediaPath(rawValue);

  if (!mediaPath) {
    return "";
  }

  return `/api/media/${mediaPath.split("/").map(encodeURIComponent).join("/")}`;
}

function normalizeMediaPath(value: string) {
  try {
    if (/^https?:\/\//i.test(value)) {
      return normalizeMediaPath(new URL(value).pathname);
    }
  } catch {
    return "";
  }

  return value
    .replace(/^\/?api\/v\d+\//i, "")
    .replace(/^\/+/, "");
}
