export type UserPermissionDto = {
  id?: string | null;
  userId: string;
  permissionCode: string;
  locationId: string | null;
  isGranted: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ManagerUserLookupDto = {
  id: string | null;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  role?: string | null;
  roles?: string[] | null;
};
