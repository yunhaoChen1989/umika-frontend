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
