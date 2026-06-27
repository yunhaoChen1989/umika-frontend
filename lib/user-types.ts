export type UserRoleDto = {
  id: string | null;
  name: string;
};

export type UserDto = {
  id: string | null;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  phone?: string | null;
  status?: string | null;
  isActive?: boolean | null;
  role?: string | null;
  roles?: Array<string | UserRoleDto> | null;
  roleIds?: string[] | null;
  loyaltyPoints?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};
