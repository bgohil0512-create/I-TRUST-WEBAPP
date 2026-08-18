const CONFIG = { SPREADSHEET_ID: PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') };

const SHOP_SCOPED_ENTITIES = new Set([
  'Categories','Brands','Products','IMEI','Suppliers','Customers','Purchases','PurchaseItems','PurchasePayments','PurchaseReturns','PurchaseReturnItems',
  'Sales','SaleItems','SalePayments','SalesReturns','SalesReturnItems','StockTransactions','LedgerAccounts','LedgerTransactions','Expenses','WarrantyRecords',
  'PaymentAllocations','InvoiceCounters','SyncLog','AuditLogs','Settings'
]);

const PERMISSION_ENTITY_NAMES = {
  Categories:'CATEGORY', Brands:'BRAND', Products:'PRODUCT', IMEI:'PRODUCT', Suppliers:'SUPPLIER', Customers:'CUSTOMER',
  Purchases:'PURCHASE', PurchaseItems:'PURCHASE', PurchasePayments:'PURCHASE', PurchaseReturns:'PURCHASE_RETURN', PurchaseReturnItems:'PURCHASE_RETURN',
  Sales:'SALES', SaleItems:'SALES', SalePayments:'SALES', SalesReturns:'SALES_RETURN', SalesReturnItems:'SALES_RETURN',
  Expenses:'EXPENSE', StockTransactions:'STOCK', LedgerAccounts:'ACCOUNTING', LedgerTransactions:'ACCOUNTING', WarrantyRecords:'WARRANTY',
  PaymentAllocations:'PAYMENT', InvoiceCounters:'INVOICE', SyncLog:'SYNC', AuditLogs:'AUDIT', Settings:'SETTINGS'
};

function permissionFor_(entity, verb) { return `${PERMISSION_ENTITY_NAMES[entity] || String(entity).replace(/s$/, '').toUpperCase()}_${verb}`; }
function doGet() { return jsonResponse({ success:true, service:'I-TRUST-WEBAPP API', version:'0.6.0' }); }

function doPost(e) {
  try {
    const body = JSON.parse(e?.postData?.contents || '{}');
    const action = body.action || 'unknown'; const payload = body.payload || {}; const requestId = body.requestId || Utilities.getUuid();
    if (action === 'LOGIN') return jsonResponse({ success:true, requestId, data:authenticate_(payload.username,payload.password) });
    const session = requireSession_(payload.token);
    return jsonResponse({ success:true, requestId, data:routeAction_(action,payload,session) });
  } catch (error) { return jsonResponse({ success:false, error:error instanceof Error ? error.message : String(error) }); }
}

function routeAction_(action, payload, session) {
  if (action === 'ME') return { user:sanitizeUser_(findById_('Users','userId',session.userId)), permissions:getEffectivePermissions_(session.userId), shops:getUserShops_(session.userId) };
  if (action === 'DASHBOARD_SUMMARY') return getDashboardSummary_(session, payload.shopId || null);
  if (action === 'SEARCH') return universalSearch_(session, String(payload.query || '').trim(), payload.shopId || null);
  if (action === 'ADMIN_OVERVIEW') return adminOverview_(session);
  if (action === 'ADMIN_SAVE_SHOP') return adminSaveShop_(session, payload.shop || {});
  if (action === 'ADMIN_SAVE_USER') return adminSaveUser_(session, payload.user || {});
  if (action === 'LIST') {
    requirePermission_(session,permissionFor_(payload.entity,'VIEW'));
    const shopId = SHOP_SCOPED_ENTITIES.has(payload.entity) ? requireShopAccess_(session,payload.shopId) : null;
    return queryRecords_(payload.entity,row => !shopId || String(row.shopId)===String(shopId));
  }
  if (action === 'GET') {
    requirePermission_(session,permissionFor_(payload.entity,'VIEW'));
    const record=findById_(payload.entity,payload.idField,payload.id); if(!record) throw new Error('Record not found.');
    if(SHOP_SCOPED_ENTITIES.has(payload.entity)) requireShopAccess_(session,record.shopId); return record;
  }
  if (action === 'CREATE') {
    requirePermission_(session,permissionFor_(payload.entity,'CREATE')); const record=payload.record||{};
    if(SHOP_SCOPED_ENTITIES.has(payload.entity)){const shopId=requireShopAccess_(session,record.shopId); if(!shopId) throw new Error('shopId is required.'); record.shopId=shopId;}
    return createRecord_(payload.entity,record);
  }
  if (action === 'UPDATE') {
    requirePermission_(session,permissionFor_(payload.entity,'EDIT')); const current=findById_(payload.entity,payload.idField,payload.id); if(!current) throw new Error('Record not found.');
    if(SHOP_SCOPED_ENTITIES.has(payload.entity)) requireShopAccess_(session,current.shopId);
    if(SHOP_SCOPED_ENTITIES.has(payload.entity)&&payload.patch?.shopId&&String(payload.patch.shopId)!==String(current.shopId)) throw new Error('Shop cannot be changed on an existing record.');
    return updateRecord_(payload.entity,payload.idField,payload.id,payload.patch||{});
  }
  if (action === 'DELETE') {
    requirePermission_(session,permissionFor_(payload.entity,'DELETE')); const current=findById_(payload.entity,payload.idField,payload.id); if(!current) throw new Error('Record not found.');
    if(SHOP_SCOPED_ENTITIES.has(payload.entity)) requireShopAccess_(session,current.shopId); return deleteRecord_(payload.entity,payload.idField,payload.id);
  }
  throw new Error(`Unknown action: ${action}`);
}

function adminOverview_(session) {
  requireAdmin_(session);
  const shops = queryRecords_('Shops');
  const users = queryRecords_('Users').map((user) => {
    const assignments = getUserShops_(user.userId);
    const primary = assignments.find((row) => String(row.isPrimary).toLowerCase() === 'true');
    return { ...sanitizeUser_(user), shopIds:assignments.map((row) => String(row.shopId)), primaryShopId:primary ? String(primary.shopId) : '' };
  });
  const roles = queryRecords_('Roles', row => String(row.status).toUpperCase() === 'ACTIVE').map((row) => ({ roleId:row.roleId, roleName:row.roleName, description:row.description }));
  return { shops, users, roles };
}

function requireAdmin_(session) {
  const user = getUserById_(session.userId);
  if (!user || String(user.status).toUpperCase() !== 'ACTIVE' || getRoleName_(user.roleId) !== 'ADMIN') throw new Error('Admin access required.');
}

function adminSaveShop_(session, input) {
  requireAdmin_(session);
  const shopId = String(input.shopId || '').trim();
  const shopName = String(input.shopName || '').trim();
  if (!shopId || !shopName) throw new Error('shopId and shopName are required.');
  const now = new Date().toISOString();
  const existing = findById_('Shops','shopId',shopId);
  const record = {
    shopId, shopName, logoUrl:String(input.logoUrl || ''), address:String(input.address || ''), mobile1:String(input.mobile1 || ''), mobile2:String(input.mobile2 || ''),
    email:String(input.email || ''), website:String(input.website || ''), city:String(input.city || ''), state:String(input.state || ''), pincode:String(input.pincode || ''),
    tagline:String(input.tagline || ''), status:String(input.status || 'ACTIVE').toUpperCase(), createdAt:existing?.createdAt || now, updatedAt:now
  };
  if (existing) return updateRecordById_('Shops','shopId',shopId,record);
  return createRecord_('Shops',record);
}

function adminSaveUser_(session, input) {
  requireAdmin_(session);
  const userId = String(input.userId || '').trim();
  const name = String(input.name || '').trim();
  const username = String(input.username || '').trim();
  const roleId = String(input.roleId || '').trim();
  if (!userId || !name || !username || !roleId) throw new Error('userId, name, username and roleId are required.');
  if (!findById_('Roles','roleId',roleId)) throw new Error('Selected role does not exist.');

  const duplicates = queryRecords_('Users', row => String(row.username).toLowerCase() === username.toLowerCase() && String(row.userId) !== userId);
  if (duplicates.length) throw new Error('Username already exists.');

  const now = new Date().toISOString();
  const existing = findById_('Users','userId',userId);
  if (!existing && !String(input.password || '')) throw new Error('Password is required for a new user.');

  const record = {
    userId, name, username, email:String(input.email || ''), passwordHash:existing?.passwordHash || '', roleId,
    status:String(input.status || 'ACTIVE').toUpperCase(), createdAt:existing?.createdAt || now, updatedAt:now, lastLoginAt:existing?.lastLoginAt || ''
  };
  if (String(input.password || '')) record.passwordHash = hashPassword_(String(input.password));
  if (existing) updateRecordById_('Users','userId',userId,record); else createRecord_('Users',record);

  syncUserShops_(userId, Array.isArray(input.shopIds) ? input.shopIds : [], String(input.primaryShopId || ''));
  return sanitizeUser_(findById_('Users','userId',userId));
}

function syncUserShops_(userId, shopIds, primaryShopId) {
  const requested = [...new Set(shopIds.map(String).filter(Boolean))];
  requested.forEach((shopId) => { if (!findById_('Shops','shopId',shopId)) throw new Error(`Shop not found: ${shopId}`); });
  if (primaryShopId && !requested.includes(primaryShopId)) throw new Error('Primary shop must be one of the assigned shops.');
  const existing = queryRecords_('UserShops', row => String(row.userId) === userId);
  const existingByShop = new Map(existing.map((row) => [String(row.shopId), row]));
  const now = new Date().toISOString();

  existing.forEach((row) => {
    const shopId = String(row.shopId);
    if (!requested.includes(shopId)) updateRecordById_('UserShops','userShopId',row.userShopId,{ status:'INACTIVE', updatedAt:now });
    else updateRecordById_('UserShops','userShopId',row.userShopId,{ status:'ACTIVE', isPrimary:shopId === primaryShopId, updatedAt:now });
  });

  requested.forEach((shopId) => {
    if (!existingByShop.has(shopId)) appendRecord_('UserShops', { userShopId:`USER_SHOP_${Utilities.getUuid()}`, userId, shopId, isPrimary:shopId === primaryShopId, status:'ACTIVE', createdAt:now });
  });
}

function universalSearch_(session, query, requestedShopId) {
  if (!query) return { query:'', results:[] };
  const term = query.toLowerCase();
  const shopId = requestedShopId ? requireShopAccess_(session, requestedShopId) : (session.roleName === 'ADMIN' ? null : requireShopAccess_(session, null));
  const specs = [
    { entity:'Customers', idField:'customerId', label:'Customer', fields:['name','mobile','aadhaar','gam','address'] },
    { entity:'Products', idField:'productId', label:'Product', fields:['productName','modelNumber','sku','supplierProductCode','color','storageVariant'] },
    { entity:'IMEI', idField:'imeiId', label:'IMEI / Serial', fields:['imei1','imei2','serialNumber'] },
    { entity:'Suppliers', idField:'supplierId', label:'Supplier', fields:['name','mobile','alternateMobile','email','cityGam'] },
    { entity:'Sales', idField:'saleId', label:'Sale / Invoice', fields:['invoiceNumber','customerId','saleId'] },
    { entity:'Purchases', idField:'purchaseId', label:'Purchase / Invoice', fields:['invoiceNumber','supplierId','purchaseId'] },
  ];
  const results = [];
  specs.forEach((spec) => {
    try {
      requirePermission_(session, permissionFor_(spec.entity, 'VIEW'));
      queryRecords_(spec.entity, (row) => {
        if (shopId && String(row.shopId) !== String(shopId)) return false;
        return spec.fields.some((field) => String(row[field] ?? '').toLowerCase().includes(term));
      }).slice(0, 25).forEach((row) => results.push({ type:spec.label, entity:spec.entity, idField:spec.idField, id:row[spec.idField], record:row }));
    } catch (_) {}
  });
  return { query, results:results.slice(0, 100) };
}

function jsonResponse(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
