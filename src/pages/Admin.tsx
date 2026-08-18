import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { getRoleName, getSession } from '../lib/auth';

type Shop = {
  shopId: string;
  shopName: string;
  mobile1?: string;
  email?: string;
  city?: string;
  state?: string;
  status?: string;
};

type User = {
  userId: string;
  name: string;
  username: string;
  email?: string;
  roleId: string;
  status?: string;
  shopIds?: string[];
  primaryShopId?: string;
};

type AdminOverview = {
  shops: Shop[];
  users: User[];
  roles: { roleId: string; roleName: string; description?: string }[];
};

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function Admin() {
  const navigate = useNavigate();
  const session = getSession();
  const isAdmin = getRoleName() === 'ADMIN';
  const [data, setData] = useState<AdminOverview | null>(null);
  const [tab, setTab] = useState<'shops' | 'users'>('shops');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [shopForm, setShopForm] = useState({
    shopId: '', shopName: '', mobile1: '', email: '', address: '', city: '', state: '', pincode: '', status: 'ACTIVE',
  });
  const [userForm, setUserForm] = useState({
    userId: '', name: '', username: '', email: '', password: '', roleId: '', status: 'ACTIVE', shopIds: [] as string[], primaryShopId: '',
  });

  async function load() {
    setLoading(true);
    setError('');
    const response = await apiRequest<AdminOverview>('ADMIN_OVERVIEW');
    if (response.success && response.data) {
      setData(response.data);
      if (!userForm.roleId && response.data.roles[0]) setUserForm((current) => ({ ...current, roleId: response.data!.roles[0].roleId }));
    } else {
      setError(response.error || 'Unable to load admin data.');
    }
    setLoading(false);
  }

  useEffect(() => { if (isAdmin) load(); else setLoading(false); }, [isAdmin]);

  if (!isAdmin) {
    return <main className="dashboard-shell"><section className="dashboard-content"><p className="error-inline">Admin access required.</p></section></main>;
  }

  function editShop(shop: Shop) {
    setTab('shops');
    setShopForm({
      shopId: shop.shopId, shopName: shop.shopName || '', mobile1: shop.mobile1 || '', email: shop.email || '',
      address: '', city: shop.city || '', state: shop.state || '', pincode: '', status: String(shop.status || 'ACTIVE').toUpperCase(),
    });
    setMessage('');
  }

  function editUser(user: User) {
    setTab('users');
    setUserForm({
      userId: user.userId, name: user.name || '', username: user.username || '', email: user.email || '', password: '',
      roleId: user.roleId || '', status: String(user.status || 'ACTIVE').toUpperCase(), shopIds: user.shopIds || [], primaryShopId: user.primaryShopId || '',
    });
    setMessage('');
  }

  async function submitShop(event: FormEvent) {
    event.preventDefault();
    if (!shopForm.shopName.trim()) return setError('Shop name is required.');
    setSaving(true); setError(''); setMessage('');
    const response = await apiRequest('ADMIN_SAVE_SHOP', { shop: { ...shopForm, shopId: shopForm.shopId || uid('SHOP') } });
    if (response.success) {
      setMessage(shopForm.shopId ? 'Shop updated successfully.' : 'Shop created successfully.');
      setShopForm({ shopId: '', shopName: '', mobile1: '', email: '', address: '', city: '', state: '', pincode: '', status: 'ACTIVE' });
      await load();
    } else setError(response.error || 'Unable to save shop.');
    setSaving(false);
  }

  async function submitUser(event: FormEvent) {
    event.preventDefault();
    if (!userForm.name.trim() || !userForm.username.trim()) return setError('Name and username are required.');
    if (!userForm.userId && !userForm.password) return setError('Password is required for a new user.');
    if (!userForm.roleId) return setError('Role is required.');
    setSaving(true); setError(''); setMessage('');
    const response = await apiRequest('ADMIN_SAVE_USER', {
      user: { ...userForm, userId: userForm.userId || uid('USER') },
    });
    if (response.success) {
      setMessage(userForm.userId ? 'User updated successfully.' : 'User created successfully.');
      setUserForm({ userId: '', name: '', username: '', email: '', password: '', roleId: data?.roles[0]?.roleId || '', status: 'ACTIVE', shopIds: [], primaryShopId: '' });
      await load();
    } else setError(response.error || 'Unable to save user.');
    setSaving(false);
  }

  function toggleShop(shopId: string) {
    setUserForm((current) => {
      const exists = current.shopIds.includes(shopId);
      const shopIds = exists ? current.shopIds.filter((id) => id !== shopId) : [...current.shopIds, shopId];
      return { ...current, shopIds, primaryShopId: exists && current.primaryShopId === shopId ? (shopIds[0] || '') : current.primaryShopId || shopIds[0] || '' };
    });
  }

  function signOut() {
    localStorage.removeItem('itrust.session');
    navigate('/login', { replace: true });
  }

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div><p className="eyebrow">I-TRUST WEBAPP</p><h2>Admin Management</h2></div>
        <div className="user-chip"><span>{session?.user.name || session?.user.username}</span><strong>ADMIN</strong><button type="button" onClick={signOut}>Logout</button></div>
      </header>

      <section className="dashboard-content">
        <div className="welcome-card">
          <div><span className="section-kicker">ADMIN CONTROL CENTER</span><h1>Shops & Users</h1><p>Create shops, create users, assign roles and control shop access.</p></div>
          <button className="secondary-button" type="button" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
        </div>

        <div className="admin-tabs">
          <button className={tab === 'shops' ? 'active' : ''} type="button" onClick={() => setTab('shops')}>Shop Management</button>
          <button className={tab === 'users' ? 'active' : ''} type="button" onClick={() => setTab('users')}>User Management</button>
        </div>

        {message && <p className="success-inline">{message}</p>}
        {error && <p className="error-inline">{error}</p>}
        {loading && <p className="status-text">Loading management data…</p>}

        {!loading && data && tab === 'shops' && (
          <>
            <section className="form-card">
              <div className="form-heading"><div><span className="section-kicker">SHOP PROFILE</span><h3>{shopForm.shopId ? 'Edit Shop' : 'Create New Shop'}</h3></div>{shopForm.shopId && <button className="secondary-button" type="button" onClick={() => setShopForm({ shopId: '', shopName: '', mobile1: '', email: '', address: '', city: '', state: '', pincode: '', status: 'ACTIVE' })}>Cancel Edit</button>}</div>
              <form className="product-form" onSubmit={submitShop}>
                <label>Shop Name *<input value={shopForm.shopName} onChange={(e) => setShopForm({ ...shopForm, shopName: e.target.value })} /></label>
                <label>Mobile<input value={shopForm.mobile1} onChange={(e) => setShopForm({ ...shopForm, mobile1: e.target.value })} /></label>
                <label>Email<input type="email" value={shopForm.email} onChange={(e) => setShopForm({ ...shopForm, email: e.target.value })} /></label>
                <label>Address<input value={shopForm.address} onChange={(e) => setShopForm({ ...shopForm, address: e.target.value })} /></label>
                <label>City / Gam<input value={shopForm.city} onChange={(e) => setShopForm({ ...shopForm, city: e.target.value })} /></label>
                <label>State<input value={shopForm.state} onChange={(e) => setShopForm({ ...shopForm, state: e.target.value })} /></label>
                <label>Pincode<input value={shopForm.pincode} onChange={(e) => setShopForm({ ...shopForm, pincode: e.target.value })} /></label>
                <label>Status<select value={shopForm.status} onChange={(e) => setShopForm({ ...shopForm, status: e.target.value })}><option>ACTIVE</option><option>INACTIVE</option></select></label>
                <button className="primary-button" disabled={saving} type="submit">{saving ? 'Saving…' : shopForm.shopId ? 'Update Shop' : 'Create Shop'}</button>
              </form>
            </section>

            <section className="table-card"><div className="form-heading"><div><span className="section-kicker">SHOP DIRECTORY</span><h3>{data.shops.length} Shops</h3></div></div><div className="table-wrap"><table><thead><tr><th>Shop</th><th>Contact</th><th>Location</th><th>Status</th><th>Action</th></tr></thead><tbody>{data.shops.map((shop) => <tr key={shop.shopId}><td><strong>{shop.shopName}</strong><small>{shop.shopId}</small></td><td>{shop.mobile1 || '-'}<small>{shop.email || ''}</small></td><td>{[shop.city, shop.state].filter(Boolean).join(', ') || '-'}</td><td><span className="status-pill">{shop.status || 'ACTIVE'}</span></td><td><button className="secondary-button" type="button" onClick={() => editShop(shop)}>Edit</button></td></tr>)}</tbody></table></div></section>
          </>
        )}

        {!loading && data && tab === 'users' && (
          <>
            <section className="form-card">
              <div className="form-heading"><div><span className="section-kicker">USER ACCOUNT</span><h3>{userForm.userId ? 'Edit User' : 'Create New User'}</h3></div>{userForm.userId && <button className="secondary-button" type="button" onClick={() => setUserForm({ userId: '', name: '', username: '', email: '', password: '', roleId: data.roles[0]?.roleId || '', status: 'ACTIVE', shopIds: [], primaryShopId: '' })}>Cancel Edit</button>}</div>
              <form className="product-form" onSubmit={submitUser}>
                <label>Full Name *<input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} /></label>
                <label>Username *<input value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} /></label>
                <label>Email<input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} /></label>
                <label>{userForm.userId ? 'New Password (optional)' : 'Password *'}<input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} /></label>
                <label>Role *<select value={userForm.roleId} onChange={(e) => setUserForm({ ...userForm, roleId: e.target.value })}>{data.roles.map((role) => <option key={role.roleId} value={role.roleId}>{role.roleName}</option>)}</select></label>
                <label>Status<select value={userForm.status} onChange={(e) => setUserForm({ ...userForm, status: e.target.value })}><option>ACTIVE</option><option>INACTIVE</option></select></label>
                <div className="shop-checklist"><span>Assign Shops</span>{data.shops.map((shop) => <label key={shop.shopId} className="check-row"><input type="checkbox" checked={userForm.shopIds.includes(shop.shopId)} onChange={() => toggleShop(shop.shopId)} />{shop.shopName}</label>)}</div>
                <label>Primary Shop<select value={userForm.primaryShopId} onChange={(e) => setUserForm({ ...userForm, primaryShopId: e.target.value })}><option value="">Auto / None</option>{data.shops.filter((shop) => userForm.shopIds.includes(shop.shopId)).map((shop) => <option key={shop.shopId} value={shop.shopId}>{shop.shopName}</option>)}</select></label>
                <button className="primary-button" disabled={saving} type="submit">{saving ? 'Saving…' : userForm.userId ? 'Update User' : 'Create User'}</button>
              </form>
            </section>

            <section className="table-card"><div className="form-heading"><div><span className="section-kicker">USER DIRECTORY</span><h3>{data.users.length} Users</h3></div></div><div className="table-wrap"><table><thead><tr><th>User</th><th>Role</th><th>Shops</th><th>Status</th><th>Action</th></tr></thead><tbody>{data.users.map((user) => <tr key={user.userId}><td><strong>{user.name}</strong><small>@{user.username} {user.email ? `• ${user.email}` : ''}</small></td><td>{user.roleId}</td><td>{user.shopIds?.length || 0}{user.primaryShopId ? ' • Primary set' : ''}</td><td><span className="status-pill">{user.status || 'ACTIVE'}</span></td><td><button className="secondary-button" type="button" onClick={() => editUser(user)}>Edit</button></td></tr>)}</tbody></table></div></section>
          </>
        )}
      </section>
    </main>
  );
}
