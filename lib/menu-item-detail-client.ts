import { getAuthHeaders } from "@/lib/cart-client";
import { mergeResolvedMenuItemDetail, type ResolvedMenuItem } from "@/lib/menu-catalog";

export async function loadMenuItemDetail(baseItem: ResolvedMenuItem) {
  const response = await fetch(`/api/menu-items/${baseItem.id}`, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    return baseItem;
  }

  return mergeResolvedMenuItemDetail(baseItem, await response.json().catch(() => null));
}
