import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { getAssignedShops, hasPermission } from '../lib/auth';

type Category = { categoryId: string; shopId: string; name: string; productType: string; status: string };
type Brand = { brandId: string; shopId: string; name: string; status: string };
type Product = { productId:string; shopId:string; productType:string; categoryId:string; brandId:string; productName:string; modelNumber:string; color:string; storageVariant:string; imageUrl:string; sku:string; purchasePrice:number; salePrice:number; mrp:number; defaultSupplierId:string; supplierProductCode:string; purchaseDate:string; purchaseInvoice:string; purchaseWarranty:string; saleWarranty:string; status:string };
type Imei = { imeiId:string; productId:string; imei1:string; imei2:string; serialNumber:string; activationDate:string; warrantyExpiryDate:string; status:string };

const emptyForm = { productType:'Mobile', categoryId:'', brandId:'', productName:'', modelNumber:'', color:'', storageVariant:'', imageUrl:'', sku:'', purchasePrice:'', salePrice:'', mrp:'', defaultSupplierId:'', supplierProductCode:'', purchaseDate:'', purchaseInvoice:'', purchaseWarranty:'', saleWarranty:'' };
const emptyImei = { imei1:'', imei2:'', serialNumber:'', activationDate:'', warrantyExpiryDate:'' };
const emptyMaster = { name:'', productType:'Mobile' };

export default function Products() {
  const navigate = useNavigate();
  const shops = getAssignedShops();
  const canCreate = hasPermission('PRODUCT_CREATE');
  const canView = hasPermission('PRODUCT_VIEW');
  const canCreateCategory = hasPermission('CATEGORY_CREATE');
  const canCreateBrand = hasPermission('BRAND_CREATE');
  const [shopId,setShopId] = useState(shops[0]?.shopId || '');
  const [products,setProducts] = useState<Product[]>([]);
  const [categories,setCategories] = useState<Category[]>([]);
  const [brands,setBrands] = useState<Brand[]>([]);
  const [form,setForm] = useState(emptyForm);
  const [imei,setImei] = useState(emptyImei);
  const [master,setMaster] = useState(emptyMaster);
  const [activeProductId,setActiveProductId] = useState('');
  const [productImeis,setProductImeis] = useState<Imei[]>([]);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [savingMaster,setSavingMaster] = useState(false);
  const [error,setError] = useState('');
  const [message,setMessage] = useState('');

  const activeCategories = useMemo(() => categories.filter(r => String(r.status).toUpperCase()==='ACTIVE'), [categories]);
  const activeBrands = useMemo(() => brands.filter(r => String(r.status).toUpperCase()==='ACTIVE'), [brands]);

  async function loadInventory() {
    if (!shopId || !canView) { setLoading(false); return; }
    setLoading(true); setError('');
    const [p,c,b] = await Promise.all([
      apiRequest<Product[]>('LIST',{entity:'Products',shopId}),
      apiRequest<Category[]>('LIST',{entity:'Categories',shopId}),
      apiRequest<Brand[]>('LIST',{entity:'Brands',shopId}),
    ]);
    if (p.success) setProducts(p.data || []); else setError(p.error || 'Unable to load products.');
    if (c.success) setCategories(c.data || []);
    if (b.success) setBrands(b.data || []);
    setLoading(false);
  }
  useEffect(() => { loadInventory(); }, [shopId]);

  async function loadProductImeis(productId:string) {
    setActiveProductId(productId);
    const response = await apiRequest<Imei[]>('LIST',{entity:'IMEI',shopId});
    if (response.success) setProductImeis((response.data || []).filter(row => String(row.productId)===productId)); else setProductImeis([]);
  }

  async function submitProduct(event:FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    if (!shopId) { setError('Please select a shop first.'); setSaving(false); return; }
    if (!form.categoryId || !form.brandId) { setError('Category and Brand are required.'); setSaving(false); return; }
    if (!form.productName.trim()) { setError('Product Name is required.'); setSaving(false); return; }
    if (form.productType==='Accessory' && !form.sku.trim()) { setError('SKU / Product Code is required for an Accessory.'); setSaving(false); return; }
    const productId = crypto.randomUUID(); const now = new Date().toISOString();
    const response = await apiRequest<Product>('CREATE',{entity:'Products',record:{
      productId,shopId,productType:form.productType,categoryId:form.categoryId,brandId:form.brandId,productName:form.productName.trim(),modelNumber:form.modelNumber.trim(),color:form.color.trim(),storageVariant:form.storageVariant.trim(),imageUrl:form.imageUrl.trim(),sku:form.sku.trim(),purchasePrice:Number(form.purchasePrice||0),salePrice:Number(form.salePrice||0),mrp:Number(form.mrp||0),wholesalePrice:0,minimumSalePrice:0,discountLimit:0,defaultSupplierId:form.defaultSupplierId.trim(),supplierProductCode:form.supplierProductCode.trim(),purchaseDate:form.purchaseDate,purchaseInvoice:form.purchaseInvoice.trim(),purchaseWarranty:form.purchaseWarranty.trim(),saleWarranty:form.saleWarranty.trim(),status:'Active',createdAt:now,updatedAt:now
    }});
    if (!response.success) { setError(response.error || 'Unable to create product.'); setSaving(false); return; }
    if (form.productType==='Mobile' && (imei.imei1.trim() || imei.imei2.trim() || imei.serialNumber.trim())) {
      const ir = await apiRequest<Imei>('CREATE',{entity:'IMEI',record:{imeiId:crypto.randomUUID(),shopId,productId,imei1:imei.imei1.trim(),imei2:imei.imei2.trim(),serialNumber:imei.serialNumber.trim(),status:'IN_STOCK',purchaseId:'',purchaseItemId:'',saleId:'',saleItemId:'',activationDate:imei.activationDate,warrantyExpiryDate:imei.warrantyExpiryDate,createdAt:now,updatedAt:now}});
      setMessage(ir.success ? 'Product and IMEI details added successfully.' : `Product created, but IMEI was not saved: ${ir.error || 'unknown error'}`);
    } else setMessage('Product added successfully.');
    setForm(emptyForm); setImei(emptyImei); await loadInventory(); setSaving(false);
  }

  async function createMaster(type:'category'|'brand') {
    setSavingMaster(true); setError(''); setMessage('');
    const name = master.name.trim(); if (!name || !shopId) { setError('Enter a name and select a shop.'); setSavingMaster(false); return; }
    const entity = type==='category' ? 'Categories' : 'Brands';
    const record = type==='category' ? {categoryId:crypto.randomUUID(),shopId,name,productType:master.productType,status:'ACTIVE',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()} : {brandId:crypto.randomUUID(),shopId,name,status:'ACTIVE',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    const response = await apiRequest('CREATE',{entity,record});
    if (response.success) { setMaster(emptyMaster); setMessage(`${type==='category'?'Category':'Brand'} added successfully.`); await loadInventory(); } else setError(response.error || `Unable to create ${type}.`);
    setSavingMaster(false);
  }
  function updateForm<K extends keyof typeof emptyForm>(key:K,value:(typeof emptyForm)[K]) { setForm(current => ({...current,[key]:value})); }

  if (!canView) return <main className="dashboard-shell"><header className="topbar"><div><p className="eyebrow">I-TRUST WEBAPP</p><h2>Products / Inventory</h2></div><button className="back-button" onClick={()=>navigate('/dashboard')}>Dashboard</button></header><section className="dashboard-content"><div className="error-inline">You do not have permission to view Products.</div></section></main>;

  return <main className="dashboard-shell">
    <header className="topbar"><div><p className="eyebrow">I-TRUST WEBAPP</p><h2>Products / Inventory</h2></div><button className="back-button" onClick={()=>navigate('/dashboard')}>Dashboard</button></header>
    <section className="dashboard-content">
      <div className="welcome-card"><div><span className="section-kicker">INVENTORY · POINT 3</span><h1>Product Management</h1><p>Manage mobiles, accessories, categories, brands, IMEI and warranty information.</p></div></div>
      <section className="shop-selector-card"><div><span className="section-kicker">ACTIVE SHOP</span><strong>{shops.find(s=>s.shopId===shopId)?.shopName || shopId || 'No shop assigned'}</strong><span className="status-text">All inventory actions are limited to the selected shop.</span></div>{shops.length>1 && <select value={shopId} onChange={e=>setShopId(e.target.value)}>{shops.map(s=><option key={s.shopId} value={s.shopId}>{String(s.shopName||s.shopId)}</option>)}</select>}</section>
      {message && <p className="success-inline">{message}</p>}{error && <p className="error-inline">{error}</p>}

      {canCreate && <section className="form-card"><div className="form-heading"><div><span className="section-kicker">3.1 ADD PRODUCT</span><h3>Product Basic Information</h3></div><span className="status-text">* Required fields</span></div>
        <form className="product-form" onSubmit={submitProduct}>
          <label>Product Type *<select value={form.productType} onChange={e=>updateForm('productType',e.target.value)}><option>Mobile</option><option>Accessory</option><option>Other</option></select></label>
          <label>Category *<select required value={form.categoryId} onChange={e=>updateForm('categoryId',e.target.value)}><option value="">Select Category</option>{activeCategories.filter(c=>c.productType===form.productType || !c.productType).map(c=><option key={c.categoryId} value={c.categoryId}>{c.name}</option>)}</select></label>
          <label>Brand *<select required value={form.brandId} onChange={e=>updateForm('brandId',e.target.value)}><option value="">Select Brand</option>{activeBrands.map(b=><option key={b.brandId} value={b.brandId}>{b.name}</option>)}</select></label>
          <label>Product Name *<input required value={form.productName} onChange={e=>updateForm('productName',e.target.value)} placeholder="e.g. iPhone 15" /></label>
          <label>Model Number<input value={form.modelNumber} onChange={e=>updateForm('modelNumber',e.target.value)} /></label>
          <label>Color<input value={form.color} onChange={e=>updateForm('color',e.target.value)} /></label>
          <label>Storage / Variant<input value={form.storageVariant} onChange={e=>updateForm('storageVariant',e.target.value)} placeholder="128GB / 256GB" /></label>
          <label>Product Image URL <span className="optional">Optional</span><input value={form.imageUrl} onChange={e=>updateForm('imageUrl',e.target.value)} placeholder="Optional" /></label>
          <label>SKU / Product Code {form.productType==='Accessory' && '*'}<input required={form.productType==='Accessory'} value={form.sku} onChange={e=>updateForm('sku',e.target.value)} placeholder={form.productType==='Accessory'?'Required for accessory':'Optional'} /></label>
          <label>Purchase Price<input type="number" min="0" value={form.purchasePrice} onChange={e=>updateForm('purchasePrice',e.target.value)} /></label>
          <label>Sale Price<input type="number" min="0" value={form.salePrice} onChange={e=>updateForm('salePrice',e.target.value)} /></label>
          <label>MRP<input type="number" min="0" value={form.mrp} onChange={e=>updateForm('mrp',e.target.value)} /></label>
          <label>Supplier ID <span className="optional">Optional</span><input value={form.defaultSupplierId} onChange={e=>updateForm('defaultSupplierId',e.target.value)} /></label>
          <label>Supplier Product Code<input value={form.supplierProductCode} onChange={e=>updateForm('supplierProductCode',e.target.value)} /></label>
          <label>Purchase Invoice<input value={form.purchaseInvoice} onChange={e=>updateForm('purchaseInvoice',e.target.value)} /></label>
          <label>Purchase Date<input type="date" value={form.purchaseDate} onChange={e=>updateForm('purchaseDate',e.target.value)} /></label>
          <label>Purchase Warranty <span className="optional">Optional</span><input value={form.purchaseWarranty} onChange={e=>updateForm('purchaseWarranty',e.target.value)} placeholder="e.g. 12 months" /></label>
          <label>Sale Warranty <span className="optional">Optional</span><input value={form.saleWarranty} onChange={e=>updateForm('saleWarranty',e.target.value)} placeholder="e.g. 12 months" /></label>
          {form.productType==='Mobile' && <div className="full-width nested-card"><div className="form-heading compact"><div><span className="section-kicker">PRODUCT IDENTIFICATION</span><h3>IMEI / Serial</h3></div><span className="status-text">IMEI 2 & Serial are optional</span></div><div className="product-form nested-grid"><label>IMEI 1<input inputMode="numeric" value={imei.imei1} onChange={e=>setImei({...imei,imei1:e.target.value})} placeholder="IMEI 1" /></label><label>IMEI 2 <span className="optional">Optional</span><input inputMode="numeric" value={imei.imei2} onChange={e=>setImei({...imei,imei2:e.target.value})} placeholder="IMEI 2" /></label><label>Serial Number <span className="optional">Optional</span><input value={imei.serialNumber} onChange={e=>setImei({...imei,serialNumber:e.target.value})} /></label><label>Activation Date<input type="date" value={imei.activationDate} onChange={e=>setImei({...imei,activationDate:e.target.value})} /></label><label>Warranty Expiry<input type="date" value={imei.warrantyExpiryDate} onChange={e=>setImei({...imei,warrantyExpiryDate:e.target.value})} /></label></div></div>}
          <button className="primary-button" disabled={saving}>{saving?'Saving…':'Add Product'}</button>
        </form>
      </section>}

      {(canCreateCategory || canCreateBrand) && <section className="master-grid">
        {canCreateCategory && <div className="form-card master-card"><div className="form-heading compact"><div><span className="section-kicker">3.4 CATEGORY</span><h3>Add Category</h3></div></div><div className="master-form"><input value={master.name} onChange={e=>setMaster({...master,name:e.target.value})} placeholder="e.g. Smartphone, Charger" /><select value={master.productType} onChange={e=>setMaster({...master,productType:e.target.value})}><option>Mobile</option><option>Accessory</option><option>Other</option></select><button type="button" className="secondary-button" disabled={savingMaster} onClick={()=>createMaster('category')}>Add Category</button></div></div>}
        {canCreateBrand && <div className="form-card master-card"><div className="form-heading compact"><div><span className="section-kicker">3.4 BRAND</span><h3>Add Brand</h3></div></div><div className="master-form"><input value={master.name} onChange={e=>setMaster({...master,name:e.target.value})} placeholder="e.g. Apple, Samsung" /><button type="button" className="secondary-button" disabled={savingMaster} onClick={()=>createMaster('brand')}>Add Brand</button></div></div>}
      </section>}

      <section className="table-card"><div className="form-heading"><div><span className="section-kicker">3.2 PRODUCT LIST / DETAILS</span><h3>Current Products</h3></div><button className="secondary-button" onClick={loadInventory}>Refresh</button></div>{loading?<p className="status-text">Loading products…</p>:products.length===0?<p className="status-text">No products found for this shop.</p>:<div className="table-wrap"><table><thead><tr><th>Product</th><th>Type</th><th>Category</th><th>Brand</th><th>SKU</th><th>Sale Price</th><th>Warranty</th><th>Status</th></tr></thead><tbody>{products.map(p=>{const category=categories.find(c=>c.categoryId===p.categoryId)?.name||'—';const brand=brands.find(b=>b.brandId===p.brandId)?.name||'—';return <tr key={p.productId}><td><strong>{p.productName}</strong><small>{[p.modelNumber,p.color,p.storageVariant].filter(Boolean).join(' · ')||'—'}</small></td><td>{p.productType}</td><td>{category}</td><td>{brand}</td><td>{p.sku||'—'}</td><td>₹{Number(p.salePrice||0).toLocaleString('en-IN')}</td><td>{p.saleWarranty||'—'}</td><td><span className="status-pill">{p.status}</span></td></tr>})}</tbody></table></div>}</section>

      <section className="table-card"><div className="form-heading"><div><span className="section-kicker">3.3 STOCK / IDENTIFICATION</span><h3>Mobile IMEI Lookup</h3></div></div><div className="imei-lookup"><select value={activeProductId} onChange={e=>e.target.value?loadProductImeis(e.target.value):setProductImeis([])}><option value="">Select a mobile product</option>{products.filter(p=>p.productType==='Mobile').map(p=><option key={p.productId} value={p.productId}>{p.productName} · {p.modelNumber||p.productId}</option>)}</select>{activeProductId&&<div className="table-wrap"><table><thead><tr><th>IMEI 1</th><th>IMEI 2</th><th>Serial</th><th>Activation</th><th>Warranty Expiry</th><th>Status</th></tr></thead><tbody>{productImeis.length?productImeis.map(row=><tr key={row.imeiId}><td>{row.imei1||'—'}</td><td>{row.imei2||'—'}</td><td>{row.serialNumber||'—'}</td><td>{row.activationDate||'—'}</td><td>{row.warrantyExpiryDate||'—'}</td><td><span className="status-pill">{row.status}</span></td></tr>):<tr><td colSpan={6}>No IMEI record found for this product.</td></tr>}</tbody></table></div>}</div></section>
    </section>
  </main>;
}
