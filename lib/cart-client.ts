import type { CartResponse } from "@/lib/cart-types";

export const guestSessionKey = "umika_guest_session_id";
export const cartIdKeyPrefix = "umika_cart_id";
export const cartChangedEventName = "umika-cart-changed";

export function getOrCreateGuestSessionId() {
  const existing = localStorage.getItem(guestSessionKey);

  if (existing) {
    return existing;
  }

  const value = crypto.randomUUID();
  localStorage.setItem(guestSessionKey, value);
  return value;
}

export function getAuthHeaders() {
  const token = localStorage.getItem("umika_access_token");
  const headers = new Headers();

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

  if (storedCartId) {
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
