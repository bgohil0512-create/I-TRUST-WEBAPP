import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { getAssignedShops, getRoleName, getSession, logout } from '../lib/auth';

type DashboardSummary = {
  scope: { role: string; shopId: string | null; global: boolean };
  date: string;
  cards: {
    todaySales: number;
    todayPurchase: number;
    todayProfit: number;
    cash: number;
    bank: number;
    upi: number;
    receivable: number;
    payable: number;
    currentStock: number;
    lowStock: number;
  };
  meta: { generatedAt: string; salesCount: number; purchaseCount: number; expenseCount: number };
};

function money(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function shopLabel(shop: Record<string, unknown>) {
  return String(shop.shopName || shop.name || shop.shopId || 'Assigned Shop');
}

export default function Dashboard() {
  const navigate = useNavigate();
  const session = getSession();
  const role = getRoleName() || 'USER';
  const shops = getAssignedShops();
  const isAdmin = role === 'ADMIN';
  const [selectedShopId, setSelectedShopId] = useState<string | undefined>(shops[0]?.shopId);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const activeShopId = useMemo(
    () => (isAdmin ? undefined : selectedShopId),
    [isAdmin, selectedShopId],
  );

  useEffect(() => {
    if (!isAdmin && shops.length > 0 && !shops.some((shop) => shop.shopId === selectedShopId)) {
      setSelectedShopId(shops[0].shopId);
    }
  }, [isAdmin, selectedShopId, shops]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');

      const response = await apiRequest<DashboardSummary>(
        'DASHBOARD_SUMMARY',
        activeShopId ? { shopId: activeShopId } : {},
      );

      if (!active) return;

      if (response.success && response.data) {
        setSummary(response.data);
      } else {
        setSummary(null);
        setError(response.error || 'Unable to load dashboard.');
      }

      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [activeShopId]);

  function signOut() {
    logout();
    navigate('/login', { replace: true });
  }

  const cards: [string, string][] = [
    ['Today’s Sales', money(summary?.cards.todaySales || 0)],
    ['Today’s Purchase', money(summary?.cards.todayPurchase || 0)],
    ['Today’s Profit', money(summary?.cards.todayProfit || 0)],
    ['Cash', money(summary?.cards.cash || 0)],
    ['Bank', money(summary?.cards.bank || 0)],
    ['UPI', money(summary?.cards.upi || 0)],
    ['Receivable', money(summary?.cards.receivable || 0)],
    ['Payable', money(summary?.cards.payable || 0)],
    ['Current Stock', String(summary?.cards.currentStock || 0)],
    ['Low Stock', String(summary?.cards.lowStock || 0)],
  ];

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">I-TRUST WEBAPP</p>
          <h2>Dashboard</h2>
        </div>

        <div className="user-chip">
          <span>{session?.user.name || session?.user.username}</span>
          <strong>{role}</strong>
          <button onClick={signOut} type="button">Logout</button>
        </div>
      </header>

      <section className="dashboard-content">
        <div className="welcome-card">
          <div>
            <span className="section-kicker">WORKSPACE</span>
            <h1>{isAdmin ? 'Admin Dashboard' : `${role} Dashboard`}</h1>
            <p>
              {isAdmin
                ? 'Global access across all shops.'
                : shops.length === 0
                  ? 'No shop has been assigned yet.'
                  : 'Your dashboard is limited to the shop assigned by Admin.'}
            </p>
          </div>

          <button className="primary-button small" onClick={() => navigate('/search')} type="button">
            Universal Search
          </button>
        </div>

        {!isAdmin && shops.length > 0 && (
          <section className="shop-selector-card" aria-label="Assigned shop">
            <div>
              <span className="section-kicker">ASSIGNED SHOP</span>
              <strong>{shops.length === 1 ? shopLabel(shops[0] as unknown as Record<string, unknown>) : 'Select Shop'}</strong>
            </div>

            <select
              value={selectedShopId || ''}
              onChange={(event) => setSelectedShopId(event.target.value || undefined)}
              aria-label="Select assigned shop"
              disabled={shops.length === 1}
            >
              {shops.map((shop) => (
                <option key={shop.shopId} value={shop.shopId}>
                  {shopLabel(shop as unknown as Record<string, unknown>)}
                </option>
              ))}
            </select>
          </section>
        )}

        {loading && <p className="status-text">Loading live dashboard…</p>}
        {error && <p className="error-inline" role="alert">{error}</p>}

        {!loading && !error && summary && (
          <p className="status-text dashboard-meta">
            Data for {summary.date} • Updated {new Date(summary.meta.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}

        <div className="metric-grid">
          {cards.map(([label, value]) => (
            <article className="metric-card" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </div>

        <section className="quick-section">
          <div>
            <span className="section-kicker">QUICK ACTIONS</span>
            <h3>Business shortcuts</h3>
          </div>
          <div className="quick-grid">
            <button type="button">New Sale</button>
            <button type="button">New Purchase</button>
            <button type="button">Customer Payment</button>
            <button type="button">Supplier Payment</button>
            <button type="button">Expense</button>
            <button type="button">Products</button>
          </div>
        </section>
      </section>
    </main>
  );
}
