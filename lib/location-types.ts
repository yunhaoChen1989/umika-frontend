export type LocationDto = {
  id: string | null;
  locationId?: string | null;
  locationCode?: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  province: string;
  postalCode: string;
  country: string | null;
  isActive: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SpringPage<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
};
