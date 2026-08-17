import { useState } from 'react';

const fields = ['Customer Name', 'Mobile Number', 'Aadhaar', 'Gam / Village', 'Product', 'IMEI 1 / IMEI 2', 'Serial Number', 'Invoice', 'Supplier', 'Payment', 'Ledger'];

export default function Search() {
  const [query, setQuery] = useState('');
  return <main className="dashboard-shell"><header className="topbar"><div><p className="eyebrow">I-TRUST WEBAPP</p><h2>Universal Search</h2></div></header><section className="dashboard-content"><div className="search-card"><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customer, mobile, IMEI, invoice…" /><div className="search-tags">{fields.map((field) => <button key={field} onClick={() => setQuery(field + ': ')}>{field}</button>)}</div>{query && <p className="search-hint">Search will be restricted by the logged-in user’s shop and permissions.</p>}</div></section></main>;
}
