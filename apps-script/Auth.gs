function hashPassword_(password) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8);
  return bytes.map((byte) => (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, '0')).join('');
}

function authenticate_(username, password) {
  const users = queryRecords_('Users', (row) => String(row.username).toLowerCase() === String(username).toLowerCase());
  const user = users[0];
  if (!user || String(user.status).toUpperCase() !== 'ACTIVE' || user.passwordHash !== hashPassword_(password)) {
    throw new Error('Invalid username or password.');
  }

  const token = Utilities.getUuid();
  CacheService.getScriptCache().put(`session:${token}`, JSON.stringify({
    userId: user.userId,
    roleId: user.roleId,
    username: user.username,
  }), 21600);

  return {
    token,
    user: sanitizeUser_(user),
    permissions: getEffectivePermissions_(user.userId),
    shops: getUserShops_(user.userId),
  };
}

function requireSession_(token) {
  if (!token) throw new Error('Authentication required.');
  const raw = CacheService.getScriptCache().get(`session:${token}`);
  if (!raw) throw new Error('Session expired.');
  return JSON.parse(raw);
}

function getUserById_(userId) {
  return findById_('Users', 'userId', userId);
}

function getUserShops_(userId) {
  return queryRecords_('UserShops', (row) =>
    String(row.userId) === String(userId) && String(row.status).toUpperCase() === 'ACTIVE'
  );
}

function getUserShop_(userId, shopId) {
  return getUserShops_(userId).find((row) => String(row.shopId) === String(shopId)) || null;
}

function getRoleName_(roleId) {
  const role = findById_('Roles', 'roleId', roleId);
  return String(role?.roleName || roleId || '').toUpperCase();
}

function getEffectivePermissions_(userId) {
  const user = getUserById_(userId);
  if (!user) throw new Error('User not found.');

  const roleName = getRoleName_(user.roleId);
  const base = typeof DEFAULT_ROLE_PERMISSIONS !== 'undefined' ? (DEFAULT_ROLE_PERMISSIONS[roleName] || []) : [];
  if (base.includes('*')) return ['*'];

  const overrides = queryRecords_('UserPermissions', (row) =>
    String(row.userId) === String(userId) && String(row.granted).toLowerCase() === 'true'
  ).map((row) => String(row.permissionKey));

  return [...new Set([...base, ...overrides])];
}

function requirePermission_(session, permission) {
  const permissions = getEffectivePermissions_(session.userId);
  if (!permissions.includes('*') && !permissions.includes(permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
}

function requireShopAccess_(session, shopId) {
  const user = getUserById_(session.userId);
  if (!user || String(user.status).toUpperCase() !== 'ACTIVE') throw new Error('Unauthorized user.');

  const roleName = getRoleName_(user.roleId);
  if (roleName === 'ADMIN') return shopId || null;
  if (!shopId) throw new Error('shopId is required.');
  if (!getUserShop_(session.userId, shopId)) throw new Error('Shop access denied.');
  return shopId;
}

function sanitizeUser_(user) {
  const copy = { ...user };
  delete copy.passwordHash;
  return copy;
}
