const ENTITY_ID_FIELDS = {
  Shops: 'shopId', Users: 'userId', Roles: 'roleId', Permissions: 'permissionId', UserPermissions: 'userPermissionId', UserShops: 'userShopId',
  Categories: 'categoryId', Brands: 'brandId', Products: 'productId', IMEI: 'imeiId', Suppliers: 'supplierId', Customers: 'customerId',
  Purchases: 'purchaseId', PurchaseItems: 'purchaseItemId', PurchasePayments: 'purchasePaymentId', PurchaseReturns: 'purchaseReturnId', PurchaseReturnItems: 'purchaseReturnItemId',
  Sales: 'saleId', SaleItems: 'saleItemId', SalePayments: 'salePaymentId', SalesReturns: 'salesReturnId', SalesReturnItems: 'salesReturnItemId',
  StockTransactions: 'stockTransactionId', LedgerAccounts: 'ledgerAccountId', LedgerTransactions: 'ledgerTransactionId', Expenses: 'expenseId', WarrantyRecords: 'warrantyId',
  PaymentAllocations: 'paymentAllocationId', InvoiceCounters: 'counterId', SyncLog: 'syncId', AuditLogs: 'auditId', Settings: 'settingId'
};

function queryRecords_(sheetName, predicate) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]]))).filter(predicate || (() => true));
}

function createRecord_(entity, record) {
  if (!SHEET_SCHEMAS[entity]) throw new Error(`Unknown entity: ${entity}`);
  const idField = ENTITY_ID_FIELDS[entity];
  if (!idField || !record?.[idField]) throw new Error(`${idField || 'ID'} is required.`);
  if (entity === 'IMEI' && hasDuplicateImei_(record)) throw new Error('Duplicate IMEI is not allowed.');
  return appendRecord_(entity, record);
}

function updateRecord_(entity, idField, id, patch) {
  const current = findById_(entity, idField, id);
  if (!current) throw new Error('Record not found.');
  if (entity === 'IMEI' && hasDuplicateImei_({ ...current, ...patch }, id)) throw new Error('Duplicate IMEI is not allowed.');
  return updateRecordById_(entity, idField, id, patch);
}

function updateRecordById_(sheetName, idField, id, patch) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) throw new Error('Record not found.');
  const headers = values[0];
  const idIndex = headers.indexOf(idField);
  if (idIndex < 0) throw new Error(`ID field not found: ${idField}`);
  for (let row = 1; row < values.length; row += 1) {
    if (String(values[row][idIndex]) === String(id)) {
      const next = { ...Object.fromEntries(headers.map((header, index) => [header, values[row][index]])), ...patch };
      sheet.getRange(row + 1, 1, 1, headers.length).setValues([headers.map((header) => next[header] ?? '')]);
      return next;
    }
  }
  throw new Error('Record not found.');
}

function deleteRecord_(entity, idField, id) {
  const record = findById_(entity, idField, id);
  if (!record) throw new Error('Record not found.');
  const statusEntities = ['Shops','Users','Categories','Brands','Products','Suppliers','Customers','Roles','Permissions','UserShops'];
  if (statusEntities.includes(entity)) return updateRecordById_(entity, idField, id, { status: 'Inactive', updatedAt: new Date().toISOString() });
  throw new Error('Permanent deletion of important transactions is not allowed.');
}

function hasDuplicateImei_(candidate, excludeId) {
  const values = [candidate.imei1, candidate.imei2].map((value) => String(value || '').replace(/\D/g, '')).filter(Boolean);
  if (!values.length) return false;
  return queryRecords_('IMEI', (row) => {
    if (excludeId && String(row.imeiId) === String(excludeId)) return false;
    const existing = [row.imei1, row.imei2].map((value) => String(value || '').replace(/\D/g, ''));
    return values.some((value) => existing.includes(value));
  }).length > 0;
}
