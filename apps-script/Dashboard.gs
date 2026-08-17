function getDashboardSummary_(session, shopId) {
  requirePermission_(session, 'DASHBOARD_VIEW');
  const roleName = getRoleName_(session.roleId);
  const scopedShopId = roleName === 'ADMIN' ? (shopId || null) : requireShopAccess_(session, shopId);
  const today = new Date();
  const todayKey = dateKey_(today);

  const sales = dashboardRows_('Sales', scopedShopId);
  const purchases = dashboardRows_('Purchases', scopedShopId);
  const expenses = dashboardRows_('Expenses', scopedShopId);
  const saleItems = dashboardRows_('SaleItems', scopedShopId);
  const products = dashboardRows_('Products', scopedShopId);
  const stockTx = dashboardRows_('StockTransactions', scopedShopId);
  const ledgerTx = dashboardRows_('LedgerTransactions', scopedShopId);

  const todaySales = sum_(sales.filter(r => dateKey_(r.saleDate || r.createdAt) === todayKey), 'grandTotal');
  const todayPurchases = sum_(purchases.filter(r => dateKey_(r.purchaseDate || r.createdAt) === todayKey), 'grandTotal');
  const todayExpenses = sum_(expenses.filter(r => dateKey_(r.expenseDate || r.createdAt) === todayKey), 'amount');
  const todaySaleIds = new Set(sales.filter(r => dateKey_(r.saleDate || r.createdAt) === todayKey).map(r => String(r.saleId)));

  const productCost = new Map(products.map(p => [String(p.productId), number_(p.purchasePrice)]));
  const todaySaleItems = saleItems.filter(r => todaySaleIds.has(String(r.saleId)));
  const todayGrossProfit = todaySaleItems.reduce((total, item) => {
    const qty = number_(item.quantity);
    const salePrice = number_(item.salePrice);
    const discount = number_(item.discount);
    return total + ((salePrice - productCost.get(String(item.productId)) || 0) * qty) - discount;
  }, 0);

  const balances = ledgerBalances_(ledgerTx);
  const receivable = sum_(sales, 'balanceAmount');
  const payable = sum_(purchases, 'balanceAmount');
  const stock = calculateStock_(stockTx);
  const lowStock = calculateLowStock_(products, stock);

  return {
    scope: { role: roleName, shopId: scopedShopId, global: roleName === 'ADMIN' && !scopedShopId },
    date: todayKey,
    cards: {
      todaySales,
      todayPurchase: todayPurchases,
      todayProfit: todayGrossProfit - todayExpenses,
      cash: balances.CASH,
      bank: balances.BANK,
      upi: balances.UPI,
      receivable,
      payable,
      currentStock: stock.total,
      lowStock: lowStock.count
    },
    stock: { total: stock.total, mobileUnits: stock.mobileUnits, accessoryUnits: stock.accessoryUnits, lowStock: lowStock.items },
    meta: { generatedAt: new Date().toISOString(), salesCount: sales.length, purchaseCount: purchases.length, expenseCount: expenses.length }
  };
}

function dashboardRows_(sheetName, shopId) {
  const rows = queryRecords_(sheetName, row => !shopId || String(row.shopId) === String(shopId));
  return rows;
}

function dateKey_(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return String(value).slice(0, 10);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function number_(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function sum_(rows, field) { return rows.reduce((total, row) => total + number_(row[field]), 0); }

function ledgerBalances_(rows) {
  const balances = { CASH:0, BANK:0, UPI:0 };
  rows.forEach(row => {
    const type = String(row.accountType || row.paymentMode || '').toUpperCase();
    const value = number_(row.credit) - number_(row.debit);
    if (type.includes('CASH')) balances.CASH += value;
    else if (type.includes('BANK')) balances.BANK += value;
    else if (type.includes('UPI')) balances.UPI += value;
  });
  return balances;
}

function calculateStock_(rows) {
  const quantities = new Map();
  rows.forEach(row => {
    const key = `${row.productId}|${row.imeiId || ''}`;
    const type = String(row.transactionType || '').toUpperCase();
    const qty = number_(row.quantity);
    const sign = ['PURCHASE','SALES_RETURN','ADJUSTMENT_IN','IN'].includes(type) ? 1 : ['SALE','PURCHASE_RETURN','ADJUSTMENT_OUT','OUT'].includes(type) ? -1 : 0;
    if (sign) quantities.set(key, (quantities.get(key) || 0) + sign * qty);
  });
  let total = 0;
  let mobileUnits = 0;
  let accessoryUnits = 0;
  quantities.forEach((qty, key) => { if (qty > 0) { total += qty; if (key.endsWith('|')) accessoryUnits += qty; else mobileUnits += qty; } });
  return { total, mobileUnits, accessoryUnits };
}

function calculateLowStock_(products, stock) {
  // The finalized product schema intentionally has no minimum-stock field yet.
  // Keep the API stable and return an empty low-stock list until that business field is added.
  return { count:0, items:[] };
}
