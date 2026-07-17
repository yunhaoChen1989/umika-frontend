import type { CartResponse } from "@/lib/cart-types";

export const guestSessionKey = "umika_guest_session_id";
export const cartIdKeyPrefix = "umika_cart_id";
export const cartChangedEventName = "umika-cart-changed";

export function getOrCreateGuestSessionId() {
  const existing = localStorage.getItem(guestSessionKey);

  if (existing) {
    return existing;
  }

  const value = createGuestSessionId();
  localStorage.setItem(guestSessionKey, value);
  return value;
}

function createGuestSessionId() {
  const browserCrypto = globalThis.crypto;

  if (typeof browserCrypto?.randomUUID === "function") {
    return browserCrypto.randomUUID();
  }

  const bytes = new Uint8Array(16);

  if (typeof browserCrypto?.getRandomValues === "function") {
    browserCrypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));

  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

export function getAuthHeaders() {
  const token = localStorage.getItem("umika_access_token");
  const headers = new Headers();
  const locale = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("umika_locale="))
    ?.split("=", 2)[1];

  headers.set("Accept-Language", locale === "zh" ? "zh-CN" : locale === "ko" ? "ko-KR" : "en-CA");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

export function normalizePayload<T>(body: unknown): T | null {
  if (body && typeof body === "object" && "data" in body) {
    return (body as { data: T | null }).data ?? null;
  }

  return (body as T | null) ?? null;
}

export function normalizeCart(body: unknown) {
  return normalizePayload<CartResponse>(body);
}

export function getCartItemCount(cart: CartResponse | null) {
  return cart?.items.reduce((count, item) => count + Number(item.quantity || 0), 0) ?? 0;
}

export function notifyCartChanged() {
  window.dispatchEvent(new Event(cartChangedEventName));
}

export async function loadOrCreateCart(locationId: string, sessionId: string, fallbackMessage: string) {
  const storedCartId = localStorage.getItem(`${cartIdKeyPrefix}:${locationId}`);
  const isAuthenticated = Boolean(localStorage.getItem("umika_access_token"));

  if (storedCartId && !isAuthenticated) {
    const response = await fetch(`/api/cart/${storedCartId}?sessionId=${encodeURIComponent(sessionId)}`, {
      method: "GET",
      headers: getAuthHeaders(),
      cache: "no-store",
    }).catch(() => null);

    if (response?.ok) {
      const existingCart = normalizeCart(await response.json().catch(() => null));

      if (existingCart && existingCart.status.toUpperCase() === "ACTIVE") {
        return existingCart;
      }
    }
  }

  const headers = getAuthHeaders();
  headers.set("Content-Type", "application/json");

  const response = await fetch("/api/cart", {
    method: "POST",
    headers,
    body: JSON.stringify({
      locationId,
      sessionId,
    }),
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    throw new Error(fallbackMessage);
  }

  const cart = normalizeCart(await response.json().catch(() => null));

  if (!cart) {
    throw new Error(fallbackMessage);
  }

  localStorage.setItem(`${cartIdKeyPrefix}:${locationId}`, cart.id);
  return cart;
}
