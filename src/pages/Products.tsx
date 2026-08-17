import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { getAssignedShops, getRoleName } from '../lib/auth';

type Product = {
  productId: string;
  shopId: string;
  productType: string;
  categoryId: string;
  brandId: string;
  productName: string;
  modelNumber: string;
  color: string;
  storageVariant: string;
  sku: string;
  purchasePrice: number;
  salePrice: number;
  mrp: number;
  status: string;
};

const emptyForm = { productType:'Mobile', productName:'', modelNumber:'', color:'', storageVariant:'', sku:'', purchasePrice:'', salePrice:'', mrp:'' };

export default function Products() {
  const navigate = useNavigate();
  const role = getRoleName() || 'USER';
  const shops = getAssignedShops();
  const [shopId, setShopId] = useState(shops[0]?.shopId || '');
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadProducts() {
    setLoading(true); setError('');
    const response = await apiRequest<Product[]>('LIST', { entity:'Products', shopId: role === 'ADMIN' ? undefined : shopId });
    if (response.success) setProducts(response.data || []);
    else setError(response.error || 'Unable to load products.');
    setLoading(false);
  }

  useEffect(() => { loadProducts(); }, [shopId]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    const targetShop = role === 'ADMIN' ? shopId : shopId;
    if (!targetShop) { setError('Please select a shop first.'); setSaving(false); return; }
    const response = await apiRequest<Product>('CREATE', {
      entity:'Products',
      record:{
        productId: crypto.randomUUID(), shopId:targetShop, productType:form.productType,
        categoryId:'', brandId:'', productName:form.productName.trim(), modelNumber:form.modelNumber.trim(),
        color:form.color.trim(), storageVariant:form.storageVariant.trim(), imageUrl:'', sku:form.sku.trim(),
        purchasePrice:Number(form.purchasePrice || 0), salePrice:Number(form.salePrice || 0), mrp:Number(form.mrp || 0),
        wholesalePrice:0, minimumSalePrice:0, discountLimit:0, defaultSupplierId:'', supplierProductCode:'',
        purchaseDate:'', purchaseInvoice:'', purchaseWarranty:'', saleWarranty:'', status:'Active',
        createdAt:new Date().toISOString(), updatedAt:new Date().toISOString()
      }
    });
    if (response.success) { setMessage('Product added successfully.'); setForm(emptyForm); await loadProducts(); }
    else setError(response.error || 'Unable to create product.');
    setSaving(false);
  }

  return <main className="dashboard-shell">
    <header className="topbar"><div><p className="eyebrow">I-TRUST WEBAPP</p><h2>Products / Inventory</h2></div><button className="back-button" onClick={() => navigate('/dashboard')}>Dashboard</button></header>
    <section className="dashboard-content">
      <div className="welcome-card"><div><span className="section-kicker">INVENTORY</span><h1>Products</h1><p>Add and view products within the permitted shop scope.</p></div></div>
      <section className="form-card">
        <div className="form-heading"><div><span className="section-kicker">ADD PRODUCT</span><h3>New Product</h3></div>{shops.length > 1 && <select value={shopId} onChange={e => setShopId(e.target.value)}>{shops.map(s => <option key={s.shopId} value={s.shopId}>{String(s.shopName || s.shopId)}</option>)}</select>}</div>
        <form className="product-form" onSubmit={submit}>
          <label>Product Type<select value={form.productType} onChange={e => setForm({...form,productType:e.target.value})}><option>Mobile</option><option>Accessory</option><option>Other</option></select></label>
          <label>Product Name<input required value={form.productName} onChange={e=>setForm({...form,productName:e.target.value})} placeholder="e.g. iPhone 15" /></label>
          <label>Model Number<input value={form.modelNumber} onChange={e=>setForm({...form,modelNumber:e.target.value})} /></label>
          <label>Color<input value={form.color} onChange={e=>setForm({...form,color:e.target.value})} /></label>
          <label>Storage / Variant<input value={form.storageVariant} onChange={e=>setForm({...form,storageVariant:e.target.value})} placeholder="128GB" /></label>
          <label>SKU / Product Code<input value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})} /></label>
          <label>Purchase Price<input type="number" min="0" value={form.purchasePrice} onChange={e=>setForm({...form,purchasePrice:e.target.value})} /></label>
          <label>Sale Price<input type="number" min="0" value={form.salePrice} onChange={e=>setForm({...form,salePrice:e.target.value})} /></label>
          <label>MRP<input type="number" min="0" value={form.mrp} onChange={e=>setForm({...form,mrp:e.target.value})} /></label>
          <button className="primary-button" disabled={saving}>{saving ? 'Saving…' : 'Add Product'}</button>
        </form>
        {message && <p className="success-inline">{message}</p>}{error && <p className="error-inline">{error}</p>}
      </section>
      <section className="table-card"><div className="form-heading"><div><span className="section-kicker">PRODUCT LIST</span><h3>Current Products</h3></div><button className="secondary-button" onClick={loadProducts}>Refresh</button></div>{loading ? <p className="status-text">Loading products…</p> : products.length === 0 ? <p className="status-text">No products found.</p> : <div className="table-wrap"><table><thead><tr><th>Product</th><th>Type</th><th>SKU</th><th>Sale Price</th><th>Status</th></tr></thead><tbody>{products.map(p=><tr key={p.productId}><td><strong>{p.productName}</strong><small>{p.modelNumber || p.color || '—'}</small></td><td>{p.productType}</td><td>{p.sku || '—'}</td><td>₹{Number(p.salePrice || 0).toLocaleString('en-IN')}</td><td><span className="status-pill">{p.status}</span></td></tr>)}</tbody></table></div>}</section>
    </section>
  </main>;
}
