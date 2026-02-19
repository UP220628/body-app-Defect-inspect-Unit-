// Role IDs según la base de datos
export const ROLES = {
  WWS: 1,
  SCM: 2,
  BODY: 3,
  CARRIER: 4,
  ADMIN: 5,
  VQA: 6,
} as const;

export type RoleId = typeof ROLES[keyof typeof ROLES];

export const ROUTE_PERMISSIONS: Record<string, number[]> = {
  '/home': [ROLES.ADMIN, ROLES.WWS, ROLES.SCM, ROLES.BODY, ROLES.CARRIER, ROLES.VQA], // Todos
  '/dashboards': [ROLES.ADMIN, ROLES.SCM], // ADMIN y SCM
  '/gestion_wws': [ROLES.ADMIN, ROLES.WWS], // ADMIN y WWS
  '/logs': [ROLES.ADMIN, ROLES.WWS, ROLES.SCM, ROLES.BODY, ROLES.CARRIER, ROLES.VQA], // Todos
  '/recibir_unidades': [ROLES.ADMIN, ROLES.BODY], // ADMIN y BODY
  '/reparar_unidades': [ROLES.ADMIN, ROLES.BODY], // ADMIN y BODY
  '/prioridad_reparaciones': [ROLES.ADMIN, ROLES.SCM], // ADMIN y SCM
  '/reportar_unidad': [ROLES.ADMIN, ROLES.CARRIER], // ADMIN y CARRIER
  '/aceptar_unidades': [ROLES.ADMIN, ROLES.CARRIER], // ADMIN y CARRIER
  '/validar_unidad': [ROLES.ADMIN, ROLES.VQA], // ADMIN y VQA
  '/profile': [ROLES.ADMIN, ROLES.WWS, ROLES.SCM, ROLES.BODY, ROLES.CARRIER, ROLES.VQA], // Todos pueden ver perfil
};

export function canAccessRoute(roleId: number, path: string): boolean {
  const allowedRoles = ROUTE_PERMISSIONS[path];
  if (!allowedRoles) return false;
  return allowedRoles.includes(roleId);
}

export function getAvailableRoutes(roleId: number): string[] {
  return Object.keys(ROUTE_PERMISSIONS).filter(path => 
    ROUTE_PERMISSIONS[path].includes(roleId)
  );
}

export const ROLE_NAMES: Record<number, string> = {
  [ROLES.WWS]: 'WWS',
  [ROLES.SCM]: 'SCM',
  [ROLES.BODY]: 'BODY',
  [ROLES.CARRIER]: 'CARRIER',
  [ROLES.ADMIN]: 'ADMIN',
  [ROLES.VQA]: 'VQA',
};
