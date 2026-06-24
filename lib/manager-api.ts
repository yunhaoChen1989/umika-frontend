import { managerDashboard, managerMenus, managerPermissions, managerRoleAccess, managerUsers } from "@/lib/manager-data";

export async function getManagerDashboard() {
  return managerDashboard;
}

export async function getManagerMenus() {
  return managerMenus;
}

export async function getManagerPermissions() {
  return managerPermissions;
}

export async function getManagerRoleAccess() {
  return managerRoleAccess;
}

export async function getManagerUsers() {
  return managerUsers;
}
