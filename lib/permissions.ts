// Role IDs según la base de datos
export const ROLES = {
  WWS: 1,
  SCM: 2,
  BODY: 3,
  CARRIER: 4,
  ADMIN: 5,
} as const;

export type RoleId = typeof ROLES[keyof typeof ROLES];

// Definición de permisos por ruta
export const ROUTE_PERMISSIONS: Record<string, number[]> = {
  '/home': [ROLES.ADMIN, ROLES.WWS, ROLES.SCM, ROLES.BODY, ROLES.CARRIER], // Todos
  '/dashboards': [ROLES.ADMIN, ROLES.SCM], // ADMIN y SCM
  '/inspeccionar_unidades': [ROLES.ADMIN, ROLES.WWS], // ADMIN y WWS
  '/logs': [ROLES.ADMIN, ROLES.WWS, ROLES.SCM, ROLES.BODY, ROLES.CARRIER], // Todos
  '/recibir_unidades': [ROLES.ADMIN, ROLES.BODY], // ADMIN y BODY
  '/reparar_unidades': [ROLES.ADMIN, ROLES.BODY], // ADMIN y BODY
  '/prioridad_reparaciones': [ROLES.ADMIN, ROLES.SCM], // ADMIN y SCM
  '/reportar_unidad': [ROLES.ADMIN, ROLES.CARRIER], // ADMIN y CARRIER
  '/aceptar_unidades': [ROLES.ADMIN, ROLES.CARRIER], // ADMIN y CARRIER
  '/profile': [ROLES.ADMIN, ROLES.WWS, ROLES.SCM, ROLES.BODY, ROLES.CARRIER], // Todos pueden ver perfil
};

// Función para verificar si un rol tiene acceso a una ruta
export function canAccessRoute(roleId: number, path: string): boolean {
  const allowedRoles = ROUTE_PERMISSIONS[path];
  if (!allowedRoles) return false;
  return allowedRoles.includes(roleId);
}

// Función para obtener rutas disponibles por rol
export function getAvailableRoutes(roleId: number): string[] {
  return Object.keys(ROUTE_PERMISSIONS).filter(path => 
    ROUTE_PERMISSIONS[path].includes(roleId)
  );
}

// Nombres amigables de roles
export const ROLE_NAMES: Record<number, string> = {
  [ROLES.WWS]: 'WWS',
  [ROLES.SCM]: 'SCM',
  [ROLES.BODY]: 'BODY',
  [ROLES.CARRIER]: 'CARRIER',
  [ROLES.ADMIN]: 'ADMIN',
};
