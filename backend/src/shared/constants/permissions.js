const ROLE_PERMISSIONS = {
  super_admin: ['*:*'],
  institution_admin: [
    'institution:read',
    'institution:update',
    'auth:manage',
    'admissions:*',
    'finance:*',
    'academics:*',
    'attendance:*',
    'communication:*',
    'timetable:*',
    'transport:*',
    'hostel:*',
    'analytics:*',
  ],
  teacher: [
    'auth:read',
    'academics:read',
    'academics:write',
    'attendance:read',
    'attendance:write',
    'communication:read',
    'communication:write',
    'timetable:read',
    'analytics:read',
  ],
  student: [
    'auth:read',
    'academics:read',
    'attendance:read',
    'communication:read',
    'timetable:read',
    'transport:read',
    'hostel:read',
  ],
  parent: [
    'auth:read',
    'admissions:read',
    'finance:read',
    'academics:read',
    'attendance:read',
    'communication:read',
    'transport:read',
  ],
  driver: ['auth:read', 'transport:read', 'transport:write', 'attendance:read'],
  accountant: ['auth:read', 'finance:*', 'analytics:read'],
  librarian: ['auth:read', 'analytics:read'],
};

const expandPermissions = (permissions = []) => [
  ...new Set(
    permissions.flatMap((permission) => {
      if (permission.endsWith(':*')) {
        const [resource] = permission.split(':');
        return [permission, `${resource}:read`, `${resource}:write`, `${resource}:manage`];
      }
      return permission;
    })
  ),
];

const getPermissionsForRole = (role) => expandPermissions(ROLE_PERMISSIONS[role] || []);

const hasPermission = (role, permission) => {
  const permissions = getPermissionsForRole(role);
  if (permissions.includes('*:*') || permissions.includes(permission)) {
    return true;
  }
  const [resource] = permission.split(':');
  return permissions.includes(`${resource}:*`);
};

module.exports = {
  ROLE_PERMISSIONS,
  getPermissionsForRole,
  hasPermission,
};
