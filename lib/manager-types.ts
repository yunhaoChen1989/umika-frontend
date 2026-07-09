export type ManagerRole = "ROLE_ADMIN" | "ROLE_MANAGER" | "ROLE_STAFF";

export type ManagerPermissionScope = "global" | "store";

export type ManagerPermission = {
  code: string;
  description: string;
  group: string;
  scope: ManagerPermissionScope;
};

export type ManagerMenu = {
  id: string;
  name: string;
  description?: string | null;
  code: string;
  path: string;
  icon: string;
  sortOrder: number;
  permission?: string;
  children?: ManagerMenu[];
};

export type ManagerUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: ManagerRole | "ROLE_CUSTOMER";
  status: "ACTIVE" | "INVITED" | "DISABLED";
  locationName: string;
  points: number;
  lastSeen: string;
  permissions: string[];
};

export type ManagerRoleAccess = {
  role: ManagerRole;
  label: string;
  scope: string;
  description: string;
  menuCodes: string[];
  permissionCodes: string[];
};

export type ManagerDashboard = {
  stats: {
    label: string;
    value: string;
    detail: string;
  }[];
  alerts: {
    label: string;
    severity: "info" | "warning" | "success";
    detail: string;
  }[];
  activity: {
    id: string;
    actor: string;
    action: string;
    target: string;
    at: string;
  }[];
};
