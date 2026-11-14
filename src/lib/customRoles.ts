import type { RoleTemplate } from "@/lib/types";
import { registerCustomRoles } from "@/data/roles";

const KEY = "pmb:customRoles:v1";

/** Load saved custom roles (client only) and register them in the role registry. */
export function loadCustomRoles(): RoleTemplate[] {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const roles = Array.isArray(parsed) ? (parsed as RoleTemplate[]).filter((r) => r && typeof r.id === "string" && r.id.startsWith("custom_")) : [];
    registerCustomRoles(roles);
    return roles;
  } catch {
    return [];
  }
}

export function saveCustomRoles(roles: RoleTemplate[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(roles));
  } catch {
    /* storage unavailable */
  }
}

/** Add (or replace) one role in storage and the registry; returns the new full list. */
export function addCustomRole(role: RoleTemplate): RoleTemplate[] {
  const next = [...loadCustomRoles().filter((r) => r.id !== role.id), role];
  registerCustomRoles([role]);
  saveCustomRoles(next);
  return next;
}
