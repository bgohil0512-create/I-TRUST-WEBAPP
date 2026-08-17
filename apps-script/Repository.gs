function getSpreadsheet_() {
  if (!CONFIG.SPREADSHEET_ID) throw new Error('SPREADSHEET_ID is not configured in Script Properties.');
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

function getSheet_(sheetName) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) throw new Error(`Sheet not found: ${sheetName}. Run setupSchema first.`);
  return sheet;
}

function appendRecord_(sheetName, record) {
  const headers = SHEET_SCHEMAS[sheetName];
  if (!headers) throw new Error(`Unknown entity: ${sheetName}`);
  getSheet_(sheetName).appendRow(headers.map((header) => record[header] ?? ''));
  return record;
}

function findById_(sheetName, idField, id) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;
  const headers = values[0];
  const idIndex = headers.indexOf(idField);
  if (idIndex < 0) throw new Error(`ID field not found: ${idField}`);
  for (let row = 1; row < values.length; row += 1) {
    if (String(values[row][idIndex]) === String(id)) {
      return Object.fromEntries(headers.map((header, index) => [header, values[row][index]]));
    }
  }
  return null;
}

const DEFAULT_ROLE_PERMISSIONS = {
  ADMIN: ['*'],
  MANAGER: [
    'CATEGORY_VIEW','CATEGORY_CREATE','CATEGORY_EDIT','BRAND_VIEW','BRAND_CREATE','BRAND_EDIT',
    'PRODUCT_VIEW','PRODUCT_CREATE','PRODUCT_EDIT','SUPPLIER_VIEW','SUPPLIER_CREATE','SUPPLIER_EDIT',
    'CUSTOMER_VIEW','CUSTOMER_CREATE','CUSTOMER_EDIT','PURCHASE_VIEW','PURCHASE_CREATE',
    'PURCHASE_RETURN_VIEW','PURCHASE_RETURN_CREATE','SALES_VIEW','SALES_CREATE','SALES_RETURN_VIEW','SALES_RETURN_CREATE',
    'EXPENSE_VIEW','EXPENSE_CREATE','STOCK_VIEW','ACCOUNTING_VIEW','WARRANTY_VIEW','PAYMENT_VIEW','PAYMENT_CREATE','INVOICE_VIEW','AUDIT_VIEW'
  ],
  USER: [
    'PRODUCT_VIEW','SUPPLIER_VIEW','CUSTOMER_VIEW','CUSTOMER_CREATE','CUSTOMER_EDIT','SALES_VIEW','SALES_CREATE',
    'SALES_RETURN_VIEW','SALES_RETURN_CREATE','STOCK_VIEW','WARRANTY_VIEW','PAYMENT_VIEW','PAYMENT_CREATE','INVOICE_VIEW'
  ]
};
