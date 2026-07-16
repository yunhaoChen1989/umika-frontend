import type { MenuCatalogCategoryDto, MenuCatalogItemDto, MenuCatalogItemOptionDto, MenuCatalogOptionGroupDto, MenuCatalogResponse } from "@/lib/menu-management-types";
import type { Locale } from "@/lib/i18n";

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

export function flattenMenuCategories(catalog: MenuCatalogResponse | null | undefined, locale: Locale = "en"): ResolvedMenuCategory[] {
  return (catalog?.categories ?? [])
    .filter((category): category is MenuCatalogCategoryDto & { id: string } => Boolean(category.id))
    .map((category) => ({
      id: category.id,
      name: getLocalizedString(category, "name", locale) ?? category.name,
      sortOrder: category.sortOrder,
    }))
    .sort((a, b) => {
      const order = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      return order === 0 ? a.name.localeCompare(b.name) : order;
    });
}

export function flattenMenuCatalog(catalog: MenuCatalogResponse | null | undefined, locale: Locale = "en"): ResolvedMenuItem[] {
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
        categoryName: getLocalizedString(category, "name", locale) ?? category.name,
        name: getLocalizedString(item, "name", locale) ?? item.name,
        description: getLocalizedString(item, "description", locale) ?? item.description,
        price: Number(item.price ?? 0),
        imageUrl: item.imageUrl ?? getImageUrl(item.images),
        displayOrder: item.displayOrder ?? item.sortOrder,
        isAvailable: item.isAvailable ?? null,
        optionGroups: normalizeOptionGroups(item, locale),
      });
    }
  }

  return items.sort((a, b) => {
    const order = (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
    return order === 0 ? a.name.localeCompare(b.name) : order;
  });
}

export function mergeResolvedMenuItemDetail(base: ResolvedMenuItem, detail: unknown, locale: Locale = "en"): ResolvedMenuItem {
  if (!isRecord(detail)) {
    return base;
  }

  const optionGroups = normalizeOptionGroups(detail as MenuCatalogItemDto, locale);

  return {
    ...base,
    categoryId: getString(detail.categoryId) ?? base.categoryId,
    name: getLocalizedString(detail, "name", locale) ?? base.name,
    description: getLocalizedString(detail, "description", locale) ?? base.description,
    price: getNumber(detail.price) ?? base.price,
    imageUrl: getString(detail.imageUrl) ?? getImageUrl(detail.images) ?? base.imageUrl,
    displayOrder: getNumber(detail.displayOrder) ?? getNumber(detail.sortOrder) ?? base.displayOrder,
    isAvailable: getBoolean(detail.isAvailable) ?? base.isAvailable,
    optionGroups: optionGroups.length ? optionGroups : base.optionGroups,
  };
}

function normalizeOptionGroups(item: MenuCatalogItemDto, locale: Locale): ResolvedMenuOptionGroup[] {
  const directOptions = normalizeOptions(readArray(item.options), null, locale);
  const groups = [
    ...normalizeGroups(readArray(item.optionGroups), locale),
    ...normalizeGroups(readArray(item.modifiers), locale),
    ...normalizeGroups(
      readArray(item.options).filter((entry) => isRecord(entry) && (Array.isArray(entry.options) || Array.isArray(entry.modifiers))),
      locale,
    ),
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

function normalizeGroups(values: unknown[], locale: Locale): ResolvedMenuOptionGroup[] {
  return values
    .filter(isRecord)
    .map((group) => ({
      id: getString(group.id),
      name: getLocalizedString(group, "name", locale) ?? getLocalizedString(group, "label", locale) ?? "",
      isRequired: getBoolean(group.isRequired),
      minSelect: getNumber(group.minSelect),
      maxSelect: getNumber(group.maxSelect),
      sortOrder: getNumber(group.sortOrder),
      options: normalizeOptions(
        readArray(group.options).length ? readArray(group.options) : readArray(group.modifiers),
        getBoolean(group.isRequired),
        locale,
      ),
    }));
}

function normalizeOptions(values: unknown[], groupRequired: boolean | null, locale: Locale): ResolvedMenuOption[] {
  return values
    .filter(isOptionRecord)
    .map((value) => {
      const id = getString(value.id) ?? getString(value.optionId);
      const name = getLocalizedString(value, "name", locale) ?? getLocalizedString(value, "label", locale);

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

function getLocalizedString(record: Record<string, unknown>, field: string, locale: Locale) {
  const suffix = locale === "zh" ? "Zh" : locale === "ko" ? "Ko" : "En";
  const snakeSuffix = locale === "zh" ? "zh" : locale === "ko" ? "ko" : "en";
  const direct = getString(record[`${field}${suffix}`]) ?? getString(record[`${field}_${snakeSuffix}`]);

  if (direct) {
    return direct;
  }

  const translations = record.translations;

  if (translations && typeof translations === "object") {
    const languageTag = locale === "zh" ? "zh-CN" : locale === "ko" ? "ko-KR" : "en-CA";
    const localized = (translations as Record<string, unknown>)[locale] ?? (translations as Record<string, unknown>)[languageTag];

    if (typeof localized === "string" && field === "name") {
      return getString(localized);
    }

    if (localized && typeof localized === "object") {
      return getString((localized as Record<string, unknown>)[field]);
    }
  }

  return getString(record[field]);
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
