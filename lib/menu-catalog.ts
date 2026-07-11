import type { MenuCatalogCategoryDto, MenuCatalogItemDto, MenuCatalogItemOptionDto, MenuCatalogOptionGroupDto, MenuCatalogResponse } from "@/lib/menu-management-types";

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
  optionGroups: ResolvedMenuOptionGroup[];
};

export type ResolvedMenuOptionGroup = {
  id: string | null;
  name: string;
  isRequired: boolean | null;
  minSelect: number | null;
  maxSelect: number | null;
  sortOrder: number | null;
  options: ResolvedMenuOption[];
};

export type ResolvedMenuOption = {
  id: string;
  name: string;
  priceModifier: number;
  isRequired: boolean | null;
  sortOrder: number | null;
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
      if (!item.id || item.isVisible === false) {
        continue;
      }

      items.push({
        id: item.id,
        categoryId: item.categoryId ?? category.id,
        categoryName: category.name,
        name: item.name,
        description: item.description,
        price: Number(item.price ?? 0),
        imageUrl: item.imageUrl ?? getImageUrl(item.images),
        displayOrder: item.displayOrder ?? item.sortOrder,
        isAvailable: item.isAvailable ?? null,
        optionGroups: normalizeOptionGroups(item),
      });
    }
  }

  return items.sort((a, b) => {
    const order = (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
    return order === 0 ? a.name.localeCompare(b.name) : order;
  });
}

export function mergeResolvedMenuItemDetail(base: ResolvedMenuItem, detail: unknown): ResolvedMenuItem {
  if (!isRecord(detail)) {
    return base;
  }

  const optionGroups = normalizeOptionGroups(detail as MenuCatalogItemDto);

  return {
    ...base,
    categoryId: getString(detail.categoryId) ?? base.categoryId,
    name: getString(detail.name) ?? base.name,
    description: getString(detail.description) ?? base.description,
    price: getNumber(detail.price) ?? base.price,
    imageUrl: getString(detail.imageUrl) ?? getImageUrl(detail.images) ?? base.imageUrl,
    displayOrder: getNumber(detail.displayOrder) ?? getNumber(detail.sortOrder) ?? base.displayOrder,
    isAvailable: getBoolean(detail.isAvailable) ?? base.isAvailable,
    optionGroups: optionGroups.length ? optionGroups : base.optionGroups,
  };
}

function normalizeOptionGroups(item: MenuCatalogItemDto): ResolvedMenuOptionGroup[] {
  const directOptions = normalizeOptions(readArray(item.options), null);
  const groups = [
    ...normalizeGroups(readArray(item.optionGroups)),
    ...normalizeGroups(readArray(item.modifiers)),
    ...normalizeGroups(readArray(item.options).filter((entry) => isRecord(entry) && (Array.isArray(entry.options) || Array.isArray(entry.modifiers)))),
  ];

  if (directOptions.length > 0) {
    groups.unshift({
      id: null,
      name: "",
      isRequired: null,
      minSelect: null,
      maxSelect: null,
      sortOrder: null,
      options: directOptions,
    });
  }

  return groups
    .map((group) => ({ ...group, options: dedupeOptions(group.options) }))
    .filter((group) => group.options.length > 0)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

function getImageUrl(value: unknown) {
  return readArray(value)
    .filter(isRecord)
    .map((image) => getString(image.imageUrl))
    .find(Boolean) ?? null;
}

function normalizeGroups(values: unknown[]): ResolvedMenuOptionGroup[] {
  return values
    .filter(isRecord)
    .map((group) => ({
      id: getString(group.id),
      name: getString(group.name) ?? getString(group.label) ?? "",
      isRequired: getBoolean(group.isRequired),
      minSelect: getNumber(group.minSelect),
      maxSelect: getNumber(group.maxSelect),
      sortOrder: getNumber(group.sortOrder),
      options: normalizeOptions(readArray(group.options).length ? readArray(group.options) : readArray(group.modifiers), getBoolean(group.isRequired)),
    }));
}

function normalizeOptions(values: unknown[], groupRequired: boolean | null): ResolvedMenuOption[] {
  return values
    .filter(isOptionRecord)
    .map((value) => {
      const id = getString(value.id) ?? getString(value.optionId);
      const name = getString(value.name) ?? getString(value.label);

      if (!id || !name || value.isActive === false) {
        return null;
      }

      return {
        id,
        name,
        priceModifier: getNumber(value.priceModifier) ?? getNumber(value.modifierPrice) ?? getNumber(value.price) ?? 0,
        isRequired: getBoolean(value.isRequired) ?? groupRequired,
        sortOrder: getNumber(value.sortOrder),
      };
    })
    .filter((option): option is ResolvedMenuOption => Boolean(option))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
}

function isOptionRecord(value: unknown): value is Record<string, unknown> & MenuCatalogItemOptionDto {
  return isRecord(value) && !Array.isArray(value.options) && !Array.isArray(value.modifiers);
}

function dedupeOptions(options: ResolvedMenuOption[]) {
  const seen = new Set<string>();
  return options.filter((option) => {
    if (seen.has(option.id)) {
      return false;
    }

    seen.add(option.id);
    return true;
  });
}

function readArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function isRecord(value: unknown): value is Record<string, unknown> & MenuCatalogItemOptionDto & MenuCatalogOptionGroupDto {
  return Boolean(value && typeof value === "object");
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  return null;
}

function getBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}
