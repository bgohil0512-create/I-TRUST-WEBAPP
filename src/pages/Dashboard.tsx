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
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const session = getSession();
  const role = getRoleName() || 'USER';
  const shops = getAssignedShops();
  const isAdmin = role === 'ADMIN';
  const assignedShop = shops[0];
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const shopId = useMemo(() => (isAdmin ? undefined : assignedShop?.shopId), [isAdmin, assignedShop?.shopId]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      const response = await apiRequest<DashboardSummary>('DASHBOARD_SUMMARY', shopId ? { shopId } : {});
      if (!active) return;
      if (response.success && response.data) setSummary(response.data);
      else setError(response.error || 'Unable to load dashboard.');
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [shopId]);

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
          <button onClick={signOut}>Logout</button>
        </div>
      </header>

      <section className="dashboard-content">
        <div className="welcome-card">
          <div>
            <span className="section-kicker">WORKSPACE</span>
            <h1>{isAdmin ? 'Admin Dashboard' : `${role} Dashboard`}</h1>
            <p>
              {isAdmin
                ? summary?.scope.global ? 'Global access across all shops.' : `Shop: ${summary?.scope.shopId || 'All Shops'}`
                : assignedShop ? `Assigned Shop: ${String(assignedShop.shopId)}` : 'No shop has been assigned yet.'}
            </p>
          </div>
          <button className="primary-button small" onClick={() => navigate('/search')}>Universal Search</button>
        </div>

        {loading && <p>Loading live dashboard…</p>}
        {error && <p role="alert">{error}</p>}

        <div className="metric-grid">
          {cards.map(([label, value]) => (
            <article className="metric-card" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </div>

        <div className="quick-grid">
          <button>New Sale</button>
          <button>New Purchase</button>
          <button>Customer Payment</button>
          <button>Supplier Payment</button>
          <button>Expense</button>
          <button>Products</button>
        </div>
      </section>
    </main>
  );
}
