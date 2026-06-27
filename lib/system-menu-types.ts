export type SystemMenuDto = {
  id: string | null;
  parentId: string | null;
  name: string;
  code: string;
  path: string | null;
  component: string | null;
  icon: string | null;
  menuType: string;
  sortOrder: number | null;
  isVisible: boolean | null;
  isEnabled: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SystemMenuUpsertRequest = {
  parentId: string | null;
  name: string;
  code: string;
  path: string | null;
  component: string | null;
  icon: string | null;
  menuType: string;
  sortOrder: number | null;
  isVisible: boolean;
  isEnabled: boolean;
};
