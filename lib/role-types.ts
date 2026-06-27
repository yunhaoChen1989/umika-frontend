export type RoleDto = {
  id: string | null;
  name: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type RoleMenuDto = {
  roleId: string;
  menuId: string;
};
