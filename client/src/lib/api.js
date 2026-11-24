const configuredApiBase = import.meta.env?.VITE_API_URL || "";

export const API_BASE = configuredApiBase.replace(/\/+$/, "");

export function resolveMediaUrl(url) {
  if (typeof url !== "string" || !url) return url;
  if (url.startsWith("/uploads/")) return `${API_BASE}${url}`;
  try {
    const parsed = new URL(url);
    return parsed.pathname.startsWith("/uploads/") ? `${API_BASE}${parsed.pathname}${parsed.search}${parsed.hash}` : url;
  } catch {
    return url;
  }
}
