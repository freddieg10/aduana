import type { UserRole } from '../types';

/**
 * What each role may do, from Freddie's user-type notes:
 *
 *  - ADMIN     — agencia de aduana o importador: everything, including client reporting.
 *  - DIGITADOR — employee: expedientes and XML generation, the product-history report, and
 *                only the suplidores side of Relacionados.
 *  - CLIENTE   — reaches the app through a link an admin generates; sees only their own
 *                expedientes, their status and the observations marked public.
 */
export type Capacidad =
  | 'expedientes'
  | 'xml'
  | 'relacionados:clientes'
  | 'relacionados:suplidores'
  | 'relacionados:depositos'
  | 'reportes:clientes'
  | 'reportes:staff'
  | 'reportes:productos'
  | 'reportes:estatus'
  | 'settings'
  | 'portal';

const CAPACIDADES: Record<UserRole, Capacidad[]> = {
  admin: [
    'expedientes', 'xml',
    'relacionados:clientes', 'relacionados:suplidores', 'relacionados:depositos',
    'reportes:clientes', 'reportes:staff', 'reportes:productos', 'reportes:estatus',
    'settings',
  ],
  digitador: ['expedientes', 'xml', 'relacionados:suplidores', 'reportes:productos'],
  cliente: ['portal'],
};

export const can = (role: UserRole | undefined, cap: Capacidad): boolean =>
  Boolean(role) && CAPACIDADES[role as UserRole].includes(cap);

/** Any of the given capabilities — used to decide whether a whole page is reachable. */
export const canAny = (role: UserRole | undefined, caps: Capacidad[]): boolean =>
  caps.some((c) => can(role, c));

export const ROLES: UserRole[] = ['admin', 'digitador', 'cliente'];
