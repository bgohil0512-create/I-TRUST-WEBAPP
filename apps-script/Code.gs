const CONFIG = {
  SPREADSHEET_ID: PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'),
};

const SHOP_SCOPED_ENTITIES = new Set([
  'Categories','Brands','Products','IMEI','Suppliers','Customers','Purchases','PurchaseItems','PurchasePayments','PurchaseReturns','PurchaseReturnItems',
  'Sales','SaleItems','SalePayments','SalesReturns','SalesReturnItems','StockTransactions','LedgerAccounts','LedgerTransactions','Expenses','WarrantyRecords',
  'PaymentAllocations','InvoiceCounters','SyncLog','AuditLogs','Settings'
]);

function doGet() {
  return jsonResponse({ success: true, service: 'I-TRUST-WEBAPP API', version: '0.3.0' });
}

function doPost(e) {
  try {
    const body = JSON.parse(e?.postData?.contents || '{}');
    const action = body.action || 'unknown';
    const payload = body.payload || {};
    const requestId = body.requestId || Utilities.getUuid();

    if (action === 'LOGIN') {
      return jsonResponse({ success: true, requestId, data: authenticate_(payload.username, payload.password) });
    }

    const session = requireSession_(payload.token);
    const result = routeAction_(action, payload, session);
    return jsonResponse({ success: true, requestId, data: result });
  } catch (error) {
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
}

function routeAction_(action, payload, session) {
  if (action === 'ME') {
    return {
      user: sanitizeUser_(findById_('Users', 'userId', session.userId)),
      permissions: getEffectivePermissions_(session.userId),
      shops: getUserShops_(session.userId),
    };
  }

  if (action === 'LIST') {
    requirePermission_(session, `${payload.entity}:VIEW`);
    const shopId = SHOP_SCOPED_ENTITIES.has(payload.entity) ? requireShopAccess_(session, payload.shopId) : null;
    return queryRecords_(payload.entity, (row) => !shopId || String(row.shopId) === String(shopId));
  }

  if (action === 'GET') {
    requirePermission_(session, `${payload.entity}:VIEW`);
    const record = findById_(payload.entity, payload.idField, payload.id);
    if (!record) throw new Error('Record not found.');
    if (SHOP_SCOPED_ENTITIES.has(payload.entity)) requireShopAccess_(session, record.shopId);
    return record;
  }

  if (action === 'CREATE') {
    requirePermission_(session, `${payload.entity}:CREATE`);
    const record = payload.record || {};
    if (SHOP_SCOPED_ENTITIES.has(payload.entity)) {
      const shopId = requireShopAccess_(session, record.shopId);
      if (!shopId) throw new Error('shopId is required.');
      record.shopId = shopId;
    }
    return createRecord_(payload.entity, record);
  }

  if (action === 'UPDATE') {
    requirePermission_(session, `${payload.entity}:EDIT`);
    const current = findById_(payload.entity, payload.idField, payload.id);
    if (!current) throw new Error('Record not found.');
    if (SHOP_SCOPED_ENTITIES.has(payload.entity)) requireShopAccess_(session, current.shopId);
    if (SHOP_SCOPED_ENTITIES.has(payload.entity) && payload.patch?.shopId && String(payload.patch.shopId) !== String(current.shopId)) {
      throw new Error('Shop cannot be changed on an existing record.');
    }
    return updateRecord_(payload.entity, payload.idField, payload.id, payload.patch || {});
  }

  if (action === 'DELETE') {
    requirePermission_(session, `${payload.entity}:DELETE`);
    const current = findById_(payload.entity, payload.idField, payload.id);
    if (!current) throw new Error('Record not found.');
    if (SHOP_SCOPED_ENTITIES.has(payload.entity)) requireShopAccess_(session, current.shopId);
    return deleteRecord_(payload.entity, payload.idField, payload.id);
  }

  throw new Error(`Unknown action: ${action}`);
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
