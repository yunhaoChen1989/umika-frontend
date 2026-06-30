export type CartItemResponse = {
  id: string;
  menuItemId: string;
  itemName: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  options: string | null;
};

export type CartResponse = {
  id: string;
  userId: string | null;
  sessionId: string | null;
  locationId: string;
  status: string;
  subtotal: number;
  items: CartItemResponse[];
  createdAt: string | null;
  updatedAt: string | null;
};

export type BackendMenuItem = {
  id: string;
  categoryId: string | null;
  locationId: string | null;
  name: string;
  description: string | null;
  price: number;
  sku: string | null;
  displayOrder: number | null;
  isAvailable: boolean | null;
  isActive: boolean | null;
  isDeleted: boolean | null;
};
