import { getAuthHeaders } from "@/lib/cart-client";
import type { Locale } from "@/lib/i18n";
import { mergeResolvedMenuItemDetail, type ResolvedMenuItem } from "@/lib/menu-catalog";

export async function loadMenuItemDetail(baseItem: ResolvedMenuItem, locale: Locale = "en") {
  const response = await fetch(`/api/menu-items/${baseItem.id}`, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    return baseItem;
  }

  return mergeResolvedMenuItemDetail(baseItem, await response.json().catch(() => null), locale);
}
