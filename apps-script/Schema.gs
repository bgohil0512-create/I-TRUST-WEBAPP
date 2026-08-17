const SHEET_SCHEMAS = {
  Shops: ['shopId','shopName','logoUrl','address','mobile1','mobile2','email','website','city','state','pincode','tagline','status','createdAt','updatedAt'],
  Users: ['userId','name','username','email','passwordHash','roleId','status','createdAt','updatedAt','lastLoginAt'],
  Roles: ['roleId','roleName','description','status'],
  Permissions: ['permissionId','permissionKey','description','status'],
  UserPermissions: ['userPermissionId','userId','permissionKey','granted','createdAt','updatedAt'],
  UserShops: ['userShopId','userId','shopId','isPrimary','status','createdAt'],
  Categories: ['categoryId','shopId','name','productType','status','createdAt','updatedAt'],
  Brands: ['brandId','shopId','name','status','createdAt','updatedAt'],
  Products: ['productId','shopId','productType','categoryId','brandId','productName','modelNumber','color','storageVariant','imageUrl','sku','purchasePrice','salePrice','mrp','wholesalePrice','minimumSalePrice','discountLimit','defaultSupplierId','supplierProductCode','purchaseDate','purchaseInvoice','purchaseWarranty','saleWarranty','status','createdAt','updatedAt'],
  IMEI: ['imeiId','shopId','productId','imei1','imei2','serialNumber','status','purchaseId','purchaseItemId','saleId','saleItemId','activationDate','warrantyExpiryDate','createdAt','updatedAt'],
  Suppliers: ['supplierId','shopId','name','mobile','alternateMobile','email','address','cityGam','state','pincode','status','createdAt','updatedAt'],
  Customers: ['customerId','shopId','name','mobile','aadhaar','customerPhotoUrl','aadhaarPhotoUrl','address','gam','status','createdAt','updatedAt'],
  Purchases: ['purchaseId','shopId','supplierId','invoiceNumber','purchaseDate','subtotal','discount','grandTotal','paidAmount','balanceAmount','paymentStatus','notes','createdBy','createdAt','updatedAt'],
  PurchaseItems: ['purchaseItemId','purchaseId','shopId','productId','quantity','purchasePrice','mrp','warranty','createdAt'],
  PurchasePayments: ['purchasePaymentId','purchaseId','shopId','paymentMode','amount','referenceNumber','paymentDate','createdBy','createdAt'],
  PurchaseReturns: ['purchaseReturnId','shopId','purchaseId','supplierId','returnDate','totalAmount','reason','createdBy','createdAt'],
  PurchaseReturnItems: ['purchaseReturnItemId','purchaseReturnId','purchaseItemId','shopId','productId','imeiId','quantity','amount','createdAt'],
  Sales: ['saleId','shopId','invoiceNumber','customerId','saleDate','subtotal','discount','grandTotal','paidAmount','balanceAmount','paymentStatus','createdBy','createdAt','updatedAt'],
  SaleItems: ['saleItemId','saleId','shopId','productId','imeiId','quantity','salePrice','discount','warranty','createdAt'],
  SalePayments: ['salePaymentId','saleId','shopId','paymentMode','amount','referenceNumber','paymentDate','createdBy','createdAt'],
  SalesReturns: ['salesReturnId','shopId','originalSaleId','customerId','returnDate','totalAmount','reason','createdBy','createdAt'],
  SalesReturnItems: ['salesReturnItemId','salesReturnId','saleItemId','shopId','productId','imeiId','quantity','amount','createdAt'],
  StockTransactions: ['stockTransactionId','shopId','productId','imeiId','transactionType','referenceType','referenceId','quantity','unitCost','transactionDate','userId','createdAt'],
  LedgerAccounts: ['ledgerAccountId','shopId','accountType','accountName','referenceType','referenceId','status','createdAt'],
  LedgerTransactions: ['ledgerTransactionId','shopId','ledgerAccountId','transactionType','referenceType','referenceId','debit','credit','transactionDate','createdBy','createdAt'],
  Expenses: ['expenseId','shopId','category','description','amount','paymentMode','referenceNumber','expenseDate','createdBy','createdAt'],
  WarrantyRecords: ['warrantyId','shopId','productId','imeiId','saleId','purchaseWarranty','saleWarranty','activationDate','expiryDate','status','createdAt','updatedAt'],
  PaymentAllocations: ['paymentAllocationId','shopId','paymentType','paymentId','referenceType','referenceId','amount','createdAt'],
  InvoiceCounters: ['counterId','shopId','financialYear','lastNumber','updatedAt'],
  SyncLog: ['syncId','operationId','shopId','userId','entityType','entityId','operation','payloadHash','status','attemptCount','lastAttemptAt','lastError','createdAt','syncedAt'],
  AuditLogs: ['auditId','shopId','userId','entityType','entityId','action','oldData','newData','deviceId','timestamp'],
  Settings: ['settingId','shopId','settingKey','settingValue','updatedAt'],
};

function setupSchema() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  Object.entries(SHEET_SCHEMAS).forEach(([sheetName, headers]) => {
    let sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) sheet = spreadsheet.insertSheet(sheetName);
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }
  });
  return jsonResponse({ success: true, sheets: Object.keys(SHEET_SCHEMAS) });
}
