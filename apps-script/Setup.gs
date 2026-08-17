function initializeSystem() {
  setupSchema();
  seedRolesAndPermissions_();
  return jsonResponse({ success: true, message: 'I-TRUST WEBAPP database foundation initialized.' });
}

function seedRolesAndPermissions_() {
  const roles = [
    { roleId: 'ROLE_ADMIN', roleName: 'ADMIN', description: 'Full authority', status: 'ACTIVE' },
    { roleId: 'ROLE_MANAGER', roleName: 'MANAGER', description: 'Shop manager', status: 'ACTIVE' },
    { roleId: 'ROLE_USER', roleName: 'USER', description: 'Shop user', status: 'ACTIVE' }
  ];

  roles.forEach((role) => {
    if (!findById_('Roles', 'roleId', role.roleId)) appendRecord_('Roles', role);
  });

  const keys = new Set(Object.values(DEFAULT_ROLE_PERMISSIONS).flat().filter((key) => key !== '*'));
  keys.forEach((permissionKey) => {
    const permissionId = `PERM_${permissionKey}`;
    if (!findById_('Permissions', 'permissionId', permissionId)) {
      appendRecord_('Permissions', {
        permissionId,
        permissionKey,
        description: permissionKey,
        status: 'ACTIVE'
      });
    }
  });
}

function createInitialAdmin(username, password, name, email) {
  if (!username || !password || !name) throw new Error('username, password and name are required.');
  if (findById_('Users', 'userId', `USER_${username}`)) throw new Error('User already exists.');

  const userId = `USER_${Utilities.getUuid()}`;
  const now = new Date().toISOString();

  appendRecord_('Users', {
    userId,
    name,
    username,
    email: email || '',
    passwordHash: hashPassword_(password),
    roleId: 'ROLE_ADMIN',
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
    lastLoginAt: ''
  });

  return { success: true, userId, username, roleId: 'ROLE_ADMIN' };
}
