import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';

type SearchResult = { type:string; entity:string; idField:string; id:string; record:Record<string, unknown> };
const fields = ['Customer name', 'Mobile number', 'Aadhaar', 'Gam / Village', 'Product', 'IMEI 1 / IMEI 2', 'Serial number', 'Invoice', 'Supplier'];

function title(result: SearchResult) {
  const r = result.record;
  return String(r.name || r.productName || r.invoiceNumber || r.imei1 || r.imei2 || r.serialNumber || result.id);
}
function detail(result: SearchResult) {
  const r = result.record;
  return String(r.mobile || r.aadhaar || r.modelNumber || r.sku || r.gam || r.cityGam || r.shopId || '');
}

export default function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function runSearch(value = query) {
    const q = value.trim();
    if (!q) { setResults([]); return; }
    setLoading(true); setError('');
    const response = await apiRequest<{query:string;results:SearchResult[]}>('SEARCH', { query:q });
    if (response.success) setResults(response.data?.results || []);
    else setError(response.error || 'Search failed.');
    setLoading(false);
  }
  function submit(event: FormEvent) { event.preventDefault(); runSearch(); }
  useEffect(() => { const timer = window.setTimeout(() => { if (query.trim().length >= 2) runSearch(query); }, 350); return () => window.clearTimeout(timer); }, [query]);

  return <main className="dashboard-shell"><header className="topbar"><div><p className="eyebrow">I-TRUST WEBAPP</p><h2>Universal Search</h2></div><button className="back-button" onClick={() => navigate('/dashboard')}>Dashboard</button></header><section className="dashboard-content"><div className="search-card"><span className="section-kicker">GLOBAL BUSINESS SEARCH</span><h1>Find anything quickly</h1><p className="search-subtitle">Search customer, mobile, Aadhaar, village, product, IMEI, invoice or supplier. Results stay inside your permitted shop scope.</p><form className="search-form" onSubmit={submit}><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search customer, mobile, IMEI, invoice…" /><button className="primary-button small" disabled={loading}>{loading ? 'Searching…' : 'Search'}</button></form><div className="search-tags">{fields.map(field=><button type="button" key={field} onClick={()=>setQuery(field + ': ')}>{field}</button>)}</div>{error && <p className="error-inline">{error}</p>}</div><section className="search-results"><div className="form-heading"><div><span className="section-kicker">RESULTS</span><h3>{query ? `${results.length} result${results.length === 1 ? '' : 's'}` : 'Start typing to search'}</h3></div></div>{results.length === 0 && query.trim() && !loading ? <p className="status-text">No matching records found.</p> : <div className="result-list">{results.map(result=><article className="result-card" key={`${result.entity}-${result.id}`}><span className="result-type">{result.type}</span><strong>{title(result)}</strong><small>{detail(result)}</small></article>)}</div>}</section></section></main>;
}
