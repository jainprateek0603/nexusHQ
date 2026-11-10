export const ROLES = ["OWNER", "ADMIN", "MEMBER", "GUEST"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "org:read",
  "org:update",
  "org:delete",
  "members:invite",
  "members:remove",
  "members:role",
  "billing:manage",
  "projects:create",
  "projects:update",
  "projects:delete",
  "projects:read",
  "tasks:create",
  "tasks:update",
  "tasks:delete",
  "tasks:read",
  "docs:create",
  "docs:update",
  "docs:delete",
  "docs:read",
  "chat:create",
  "chat:post",
  "chat:read",
  "search:read",
  "audit:read",
  "activity:read",
  "apikeys:manage",
  "webhooks:manage",
  "ai:use",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL = new Set<Permission>(PERMISSIONS);

function allow(list: readonly Permission[]): ReadonlySet<Permission> {
  return new Set(list);
}

export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  OWNER: ALL,
  ADMIN: allow(PERMISSIONS.filter((permission) => permission !== "org:delete" && permission !== "members:role")),
  MEMBER: allow([
    "org:read",
    "projects:create",
    "projects:update",
    "projects:read",
    "tasks:create",
    "tasks:update",
    "tasks:delete",
    "tasks:read",
    "docs:create",
    "docs:update",
    "docs:read",
    "chat:create",
    "chat:post",
    "chat:read",
    "search:read",
    "activity:read",
    "ai:use",
  ]),
  GUEST: allow([
    "org:read",
    "projects:read",
    "tasks:read",
    "tasks:update",
    "docs:read",
    "chat:read",
    "chat:post",
    "search:read",
  ]),
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

export function permissionsForRole(role: Role): Permission[] {
  return PERMISSIONS.filter((permission) => ROLE_PERMISSIONS[role].has(permission));
}

export function assertScopeSubset(scopes: readonly string[], role: Role): boolean {
  return scopes.every((scope) => isPermission(scope) && roleHasPermission(role, scope));
}
