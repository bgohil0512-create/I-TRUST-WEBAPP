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
function doGet() { return jsonResponse({ success:true, service:'I-TRUST-WEBAPP API', version:'0.5.0' }); }

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
