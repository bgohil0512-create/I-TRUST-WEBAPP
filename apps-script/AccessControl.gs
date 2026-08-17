const DEFAULT_ROLE_PERMISSIONS = {
  ADMIN: ['*'],
  MANAGER: [
    'DASHBOARD_VIEW', 'PRODUCT_VIEW', 'PRODUCT_CREATE', 'PRODUCT_EDIT',
    'PURCHASE_VIEW', 'PURCHASE_CREATE', 'PURCHASE_RETURN',
    'SALES_VIEW', 'SALES_CREATE', 'SALES_RETURN',
    'CUSTOMER_VIEW', 'CUSTOMER_EDIT', 'SUPPLIER_VIEW', 'SUPPLIER_EDIT',
    'REPORT_VIEW', 'PROFIT_VIEW', 'ACCOUNTING_VIEW'
  ],
  USER: ['DASHBOARD_VIEW', 'PRODUCT_VIEW', 'SALES_VIEW', 'SALES_CREATE', 'CUSTOMER_VIEW']
};

function getRoleName_(roleId) {
  const role = findById_('Roles', 'roleId', roleId);
  return normalizeRole_(role ? role.roleName : roleId);
}

function getUserPermissions_(userId) {
  const user = getUserById_(userId);
  if (!user) throw new Error('User not found.');
  const roleName = getRoleName_(user.roleId);
  return DEFAULT_ROLE_PERMISSIONS[roleName] || [];
}

function assertAdmin_(userId) {
  const user = getUserById_(userId);
  if (!user || getRoleName_(user.roleId) !== 'ADMIN') throw new Error('Admin permission required.');
  return user;
}

function assignUserToShop_(adminUserId, userId, shopId, isPrimary) {
  assertAdmin_(adminUserId);
  if (!findById_('Users', 'userId', userId)) throw new Error('Target user not found.');
  if (!findById_('Shops', 'shopId', shopId)) throw new Error('Shop not found.');

  const existing = getUserShop_(userId, shopId);
  if (existing) throw new Error('User is already assigned to this shop.');

  if (isPrimary) clearPrimaryShop_(userId);
  return appendRecord_('UserShops', {
    userShopId: Utilities.getUuid(),
    userId,
    shopId,
    isPrimary: Boolean(isPrimary),
    status: 'Active',
    createdAt: new Date().toISOString(),
  });
}

function clearPrimaryShop_(userId) {
  const sheet = getSheet_('UserShops');
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return;
  const headers = values[0];
  const userIndex = headers.indexOf('userId');
  const primaryIndex = headers.indexOf('isPrimary');

  for (let row = 1; row < values.length; row += 1) {
    if (String(values[row][userIndex]) === String(userId)) {
      sheet.getRange(row + 1, primaryIndex + 1).setValue(false);
    }
  }
}

function setUserStatus_(adminUserId, userId, status) {
  assertAdmin_(adminUserId);
  if (!['Active', 'Inactive'].includes(status)) throw new Error('Invalid user status.');
  return updateRecordById_('Users', 'userId', userId, { status });
}

function createShop_(adminUserId, shop) {
  assertAdmin_(adminUserId);
  if (!shop.shopName || !shop.mobile1) throw new Error('shopName and mobile1 are required.');

  return appendRecord_('Shops', {
    ...shop,
    shopId: Utilities.getUuid(),
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

function updateShop_(adminUserId, shopId, patch) {
  assertAdmin_(adminUserId);
  return updateRecordById_('Shops', 'shopId', shopId, {
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

function setShopStatus_(adminUserId, shopId, status) {
  assertAdmin_(adminUserId);
  if (!['Active', 'Inactive'].includes(status)) throw new Error('Invalid shop status.');
  return updateRecordById_('Shops', 'shopId', shopId, {
    status,
    updatedAt: new Date().toISOString(),
  });
}
