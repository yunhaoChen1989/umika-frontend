export type MenuRecommendation = {
  id: string;
  locationId: string | null;
  menuItemId: string;
  title: string | null;
  subtitle: string | null;
  sortOrder: number | null;
  isActive: boolean | null;
  isVisible?: boolean | null;
  locationItemVisible?: boolean | null;
  categoryId: string | null;
  itemName: string | null;
  itemDescription: string | null;
  price: number | null;
  imageUrl: string | null;
  sku: string | null;
  isAvailable: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type MenuRecommendationPayload = {
  locationId: string | null;
  menuItemId: string;
  title?: string | null;
  subtitle?: string | null;
  sortOrder: number;
  isActive: boolean;
};
