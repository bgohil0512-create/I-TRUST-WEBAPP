import { Navigate, Route, Routes } from 'react-router-dom'

function Foundation() {
  return (
    <main className="foundation-shell">
      <section className="foundation-card">
        <div className="brand-mark">IT</div>
        <p className="eyebrow">I-TRUST WEBAPP</p>
        <h1>Premium Accounting System</h1>
        <p className="subtitle">
          Project foundation is ready. Authentication, multi-shop, inventory,
          sales, purchase, accounting and offline sync will be built on this base.
        </p>
        <div className="status-row">
          <span className="status-dot" />
          Phase 1 · Foundation
        </div>
      </section>
    </main>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Foundation />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
