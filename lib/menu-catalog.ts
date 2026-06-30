import type { MenuCatalogCategoryDto, MenuCatalogResponse } from "@/lib/menu-management-types";

export type ResolvedMenuCategory = {
  id: string;
  name: string;
  sortOrder: number | null;
};

export type ResolvedMenuItem = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  displayOrder: number | null;
  isAvailable: boolean | null;
};

export function flattenMenuCategories(catalog: MenuCatalogResponse | null | undefined): ResolvedMenuCategory[] {
  return (catalog?.categories ?? [])
    .filter((category): category is MenuCatalogCategoryDto & { id: string } => Boolean(category.id))
    .map((category) => ({
      id: category.id,
      name: category.name,
      sortOrder: category.sortOrder,
    }))
    .sort((a, b) => {
      const order = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      return order === 0 ? a.name.localeCompare(b.name) : order;
    });
}

export function flattenMenuCatalog(catalog: MenuCatalogResponse | null | undefined): ResolvedMenuItem[] {
  const items: ResolvedMenuItem[] = [];

  for (const category of catalog?.categories ?? []) {
    if (!category.id) {
      continue;
    }

    for (const item of category.items ?? []) {
      if (!item.id || item.isVisible === false || item.isAvailable === false) {
        continue;
      }

      items.push({
        id: item.id,
        categoryId: item.categoryId ?? category.id,
        categoryName: category.name,
        name: item.name,
        description: item.description,
        price: Number(item.price ?? 0),
        imageUrl: item.imageUrl ?? item.images?.find((image) => image.imageUrl)?.imageUrl ?? null,
        displayOrder: item.displayOrder ?? item.sortOrder,
        isAvailable: item.isAvailable ?? null,
      });
    }
  }

  return items.sort((a, b) => {
    const order = (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
    return order === 0 ? a.name.localeCompare(b.name) : order;
  });
}
