import { useNavigate } from 'react-router-dom';
import { getSession, logout } from '../lib/auth';

const cards = [
  ['Today’s Sales', '₹0'], ['Today’s Purchase', '₹0'], ['Today’s Profit', '₹0'],
  ['Cash', '₹0'], ['Bank', '₹0'], ['UPI', '₹0'], ['Receivable', '₹0'], ['Payable', '₹0'],
];

export default function Dashboard() {
  const navigate = useNavigate();
  const session = getSession();
  const role = session?.user.roleId || 'USER';

  function signOut() { logout(); navigate('/login', { replace: true }); }

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div><p className="eyebrow">I-TRUST WEBAPP</p><h2>Dashboard</h2></div>
        <div className="user-chip"><span>{session?.user.name || session?.user.username}</span><strong>{role}</strong><button onClick={signOut}>Logout</button></div>
      </header>
      <section className="dashboard-content">
        <div className="welcome-card"><div><span className="section-kicker">WORKSPACE</span><h1>{role === 'ADMIN' ? 'Admin Dashboard' : `${role} Dashboard`}</h1><p>Your assigned shop and permitted modules will appear here.</p></div><button className="primary-button small" onClick={() => navigate('/search')}>Universal Search</button></div>
        <div className="metric-grid">{cards.map(([label, value]) => <article className="metric-card" key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
        <div className="quick-grid"><button>New Sale</button><button>New Purchase</button><button>Customer Payment</button><button>Supplier Payment</button><button>Expense</button><button>Products</button></div>
      </section>
    </main>
  );
}
