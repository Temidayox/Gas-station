'use client'
import { useEffect, useState, useCallback } from 'react'
import { fmt, fmtKg } from '@/lib/utils'
import styles from './customers.module.css'

type Customer = {
  id: string; name: string; email: string; phone: string | null
  cylinders: { id: string; size: number }[]
  totalSpend: number; totalKg: number; refillCount: number
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/customers', { cache: 'no-store' })
      const d = await res.json()
      setCustomers(Array.isArray(d) ? d : [])
    } catch { setCustomers([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchCustomers()
    // Poll every 10s so new registrations appear automatically
    const interval = setInterval(fetchCustomers, 10000)
    return () => clearInterval(interval)
  }, [fetchCustomers])

  const filtered = customers.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search) ||
    c.cylinders.some(cy => cy.id.toLowerCase().includes(search.toLowerCase()))
  )

  if (loading) return <div className={styles.loading}><div className="spinner" /></div>

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>Customers</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className={styles.count}>{customers.length} registered</span>
          <button className={styles.refreshBtn} onClick={fetchCustomers}>↻ Refresh</button>
        </div>
      </div>

      <input
        className={styles.search}
        type="text"
        placeholder="Search by name, email, phone or cylinder ID…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          {search ? 'No customers match your search.' : 'No customers registered yet.'}
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map(c => (
            <div key={c.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.avatar}>{(c.name ?? '?')[0].toUpperCase()}</div>
                <div>
                  <div className={styles.name}>{c.name}</div>
                  <div className={styles.email}>{c.email}</div>
                  {c.phone && <div className={styles.phone}>{c.phone}</div>}
                </div>
              </div>
              <div className={styles.statsGrid}>
                {[
                  ['Total Spent', fmt(c.totalSpend)],
                  ['Total KG',   `${(c.totalKg || 0).toFixed(1)} kg`],
                  ['Refills',    c.refillCount],
                  ['Cylinders',  c.cylinders.length],
                ].map(([l, v]) => (
                  <div key={String(l)} className={styles.stat}>
                    <div className={styles.statLabel}>{l}</div>
                    <div className={styles.statVal}>{v}</div>
                  </div>
                ))}
              </div>
              <div className={styles.cylLabel}>Linked Cylinders:</div>
              <div className={styles.cylList}>
                {c.cylinders.map(cyl => (
                  <span key={cyl.id} className={styles.cylBadge}>{cyl.id} <span className={styles.cylSize}>{cyl.size}kg</span></span>
                ))}
                {c.cylinders.length === 0 && <span className={styles.noCyl}>None linked yet</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
