const DEFAULT_ROLE_PERMISSIONS = {
  ADMIN: ['*'],
  MANAGER: [
    'CATEGORY_VIEW','CATEGORY_CREATE','CATEGORY_EDIT',
    'BRAND_VIEW','BRAND_CREATE','BRAND_EDIT',
    'PRODUCT_VIEW','PRODUCT_CREATE','PRODUCT_EDIT',
    'SUPPLIER_VIEW','SUPPLIER_CREATE','SUPPLIER_EDIT',
    'CUSTOMER_VIEW','CUSTOMER_CREATE','CUSTOMER_EDIT',
    'PURCHASE_VIEW','PURCHASE_CREATE',
    'PURCHASE_RETURN_VIEW','PURCHASE_RETURN_CREATE',
    'SALES_VIEW','SALES_CREATE',
    'SALES_RETURN_VIEW','SALES_RETURN_CREATE',
    'STOCK_VIEW','WARRANTY_VIEW','PAYMENT_VIEW','ACCOUNTING_VIEW',
    'EXPENSE_VIEW','EXPENSE_CREATE','INVOICE_VIEW','SETTINGS_VIEW'
  ],
  USER: [
    'PRODUCT_VIEW',
    'SUPPLIER_VIEW',
    'CUSTOMER_VIEW','CUSTOMER_CREATE',
    'SALES_VIEW','SALES_CREATE',
    'STOCK_VIEW','WARRANTY_VIEW',
    'INVOICE_VIEW'
  ]
};

function initializeSystem() {
  if (!CONFIG.SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID is not configured in Script Properties.');
  }
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

  const keys = new Set(
    Object.values(DEFAULT_ROLE_PERMISSIONS)
      .flat()
      .filter((key) => key !== '*')
  );

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
  if (!username || !password || !name) {
    throw new Error('username, password and name are required.');
  }

  const existing = queryRecords_('Users', (row) =>
    String(row.username).toLowerCase() === String(username).toLowerCase()
  );

  if (existing.length) throw new Error('Username already exists.');

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

  return {
    success: true,
    userId,
    username,
    roleId: 'ROLE_ADMIN'
  };
}
