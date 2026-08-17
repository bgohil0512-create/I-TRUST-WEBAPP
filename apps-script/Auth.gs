const ROLE_PERMISSIONS = {
  ADMIN: ['*'],
  MANAGER: ['*'],
  USER: [],
};

function hashPassword_(password) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8);
  return bytes.map((byte) => (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, '0')).join('');
}

function authenticate_(username, password) {
  const users = queryRecords_('Users', (row) => String(row.username).toLowerCase() === String(username).toLowerCase());
  const user = users[0];
  if (!user || user.status !== 'Active' || user.passwordHash !== hashPassword_(password)) {
    throw new Error('Invalid username or password.');
  }

  const token = Utilities.getUuid();
  CacheService.getScriptCache().put(`session:${token}`, JSON.stringify({
    userId: user.userId,
    roleId: user.roleId,
    username: user.username,
  }), 21600);

  return { token, user: sanitizeUser_(user) };
}

function requireSession_(token) {
  if (!token) throw new Error('Authentication required.');
  const raw = CacheService.getScriptCache().get(`session:${token}`);
  if (!raw) throw new Error('Session expired.');
  return JSON.parse(raw);
}

function requirePermission_(session, permission) {
  const role = findById_('Roles', 'roleId', session.roleId);
  if (!role) throw new Error('Role not found.');
  const permissions = ROLE_PERMISSIONS[role.roleName] || [];
  if (!permissions.includes('*') && !permissions.includes(permission)) {
    throw new Error('Permission denied.');
  }
}

function sanitizeUser_(user) {
  const copy = { ...user };
  delete copy.passwordHash;
  return copy;
}
