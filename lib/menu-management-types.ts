export type MenuCategoryDto = {
  id: string | null;
  locationId: string | null;
  name: string;
  description: string | null;
  sortOrder: number | null;
  isActive: boolean | null;
  isDeleted: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type MenuItemDto = {
  id: string | null;
  categoryId: string;
  locationId: string | null;
  name: string;
  description: string | null;
  price: string | number | null;
  sku: string | null;
  displayOrder: number | null;
  isAvailable: boolean | null;
  isActive: boolean | null;
  isDeleted: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type MenuItemImageDto = {
  id: string | null;
  menuItemId: string;
  imageUrl: string;
  isPrimary: boolean | null;
  sortOrder: number | null;
  createdAt: string | null;
};

export type MenuOverrideTargetType = "CATEGORY" | "ITEM";

export type LocationMenuOverrideDto = {
  id: string | null;
  locationId: string;
  targetType: MenuOverrideTargetType;
  targetId: string;
  isVisible: boolean | null;
  sortOrder: number | null;
  customName: string | null;
  customDescription: string | null;
  customPrice: string | number | null;
  customImageUrl?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type MenuCatalogImageDto = {
  id: string | null;
  imageUrl: string;
  isPrimary: boolean | null;
  sortOrder: number | null;
};

export type MenuCatalogItemDto = {
  id: string | null;
  categoryId?: string | null;
  locationId?: string | null;
  name: string;
  description: string | null;
  price: string | number | null;
  sortOrder: number | null;
  displayOrder?: number | null;
  isVisible: boolean | null;
  imageUrl?: string | null;
  images?: MenuCatalogImageDto[] | null;
};

export type MenuCatalogCategoryDto = {
  id: string | null;
  locationId?: string | null;
  name: string;
  description: string | null;
  sortOrder: number | null;
  isVisible: boolean | null;
  isActive?: boolean | null;
  isDeleted?: boolean | null;
  items?: MenuCatalogItemDto[] | null;
};

export type MenuCatalogResponse = {
  locationId?: string | null;
  locationCode?: string | null;
  locationName?: string | null;
  categories?: MenuCatalogCategoryDto[] | null;
};
