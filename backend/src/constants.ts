export const USER_ROLES = ["donor", "ngo", "volunteer", "admin"] as const;
export const ORGANIZATION_TYPES = ["restaurant", "canteen", "event", "shelter", "individual"] as const;

export type UserRole = typeof USER_ROLES[number];
export type OrganizationType = typeof ORGANIZATION_TYPES[number];
