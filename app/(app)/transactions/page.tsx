'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { fmt, fmtKg, fmtD, fmtT } from '@/lib/utils'
import styles from './transactions.module.css'

type Tx = {
  id: string; naira: number; kg: number; paymentMethod: string; cylinderId: string | null;
  cylinderSize: number; isAnonymous: boolean; createdAt: string; smokeUsed: number;
  outlet: { name: string }; cylinder?: { owner?: { name: string } | null } | null
}

function ReceiptModal({ tx, onClose }: { tx: Tx; onClose: () => void }) {
  const smokeUsed = tx.smokeUsed ?? 0
  const totalBill = tx.naira + smokeUsed
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff', borderRadius: 16, padding: 28,
          width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'var(--gp)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 12px',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--g)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--ink)' }}>Transaction Receipt</div>
          <div style={{ fontSize: 12, color: 'var(--inks)', marginTop: 4 }}>{fmtD(tx.createdAt)} · {fmtT(tx.createdAt)}</div>
        </div>

        {/* Receipt rows */}
        <div style={{ borderTop: '1px solid var(--bdr)', paddingTop: 16 }}>
          {[
            ['TX ID', tx.id.slice(0, 16).toUpperCase()],
            ['Outlet', tx.outlet?.name ?? '—'],
            ['Customer', tx.cylinder?.owner?.name ?? 'Walk-in'],
            ['Cylinder ID', tx.cylinderId ?? '—'],
            ['Cylinder Size', `${tx.cylinderSize} kg`],
            ['Total Bill', fmt(totalBill)],
            ...(smokeUsed > 0 ? [
              ['🔥 Smoke Used', `${smokeUsed} Smoke (−${fmt(smokeUsed)})`],
              ['Naira Charged', fmt(tx.naira)],
            ] : [['Amount Paid', fmt(tx.naira)]]),
            ['Gas Dispensed', fmtKg(tx.kg)],
            ['Payment', tx.paymentMethod?.replace('_', ' ')],
          ].map(([label, value]) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '7px 0', borderBottom: '1px solid var(--bdr)',
              fontSize: 13,
            }}>
              <span style={{ color: 'var(--inks)' }}>{label}</span>
              <span style={{
                fontWeight: 600, color: label === '🔥 Smoke Used' ? '#FF8C00' : 'var(--ink)',
                maxWidth: '55%', textAlign: 'right',
              }}>{value}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%', marginTop: 20, padding: '12px',
            background: 'var(--g)', color: 'white', border: 'none',
            borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default function TransactionsPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const [txs, setTxs]         = useState<Tx[]>([])
  const [outlet, setOutlet]   = useState('all')
  const [days, setDays]       = useState('30')
  const [search, setSearch]   = useState('')
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({ total: 0, rev: 0, kg: 0 })
  const [selected, setSelected] = useState<Tx | null>(null)

  const fetchTxs = useCallback(async () => {
    setLoading(true)
    try {
      let url = `/api/transactions?days=${days}&limit=500`
      if (outlet !== 'all') url += `&outletId=${outlet}`
      const res = await fetch(url)
      const data = await res.json()
      const txList = Array.isArray(data) ? data : []
      setTxs(txList)
      setSummary({
        total: txList.length,
        rev:   txList.reduce((s: number, t: Tx) => s + t.naira, 0),
        kg:    txList.reduce((s: number, t: Tx) => s + t.kg, 0),
      })
    } catch { setTxs([]) }
    finally { setLoading(false) }
  }, [outlet, days])

  useEffect(() => { fetchTxs() }, [fetchTxs])

  const filtered = search
    ? txs.filter(t =>
        t.outlet?.name?.toLowerCase().includes(search.toLowerCase()) ||
        (t.cylinderId?.toLowerCase().includes(search.toLowerCase())) ||
        t.paymentMethod?.toLowerCase().includes(search.toLowerCase())
      )
    : txs

  const PAY_COLORS: Record<string, { bg: string; color: string }> = {
    CASH:         { bg: 'var(--gp)',  color: 'var(--g)'   },
    TRANSFER:     { bg: '#e8f0fe',    color: '#1a73e8'     },
    POS_TERMINAL: { bg: 'var(--al)',  color: 'var(--amd)' },
  }

  return (
    <div className={styles.wrap}>
      {selected && <ReceiptModal tx={selected} onClose={() => setSelected(null)} />}

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Transactions</h1>
          <div className={styles.sub}>{filtered.length} records · click any row to view receipt</div>
        </div>
        <button className={styles.refreshBtn} onClick={fetchTxs} disabled={loading}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{animation:loading?'spin 0.8s linear infinite':undefined}}><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
          Refresh
        </button>
      </div>

      <div className={styles.summaryStrip}>
        {[
          ['Transactions', summary.total.toLocaleString(), 'Total records'],
          ['Revenue', fmt(summary.rev), 'Total collected'],
          ['Gas Sold', `${summary.kg.toFixed(0)} kg`, 'Total dispensed'],
          ['Avg. Sale', summary.total ? fmt(summary.rev / summary.total) : '₦0', 'Per transaction'],
        ].map(([l,v,s]) => (
          <div key={l} className={styles.summaryItem}>
            <div className={styles.summaryLabel}>{l}</div>
            <div className={styles.summaryVal}>{v}</div>
            <div className={styles.summarySub}>{s}</div>
          </div>
        ))}
      </div>

      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input className={styles.searchInp} placeholder="Search outlet, cylinder ID, payment…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className={styles.clearBtn} onClick={() => setSearch('')}>×</button>}
        </div>
        {user?.role === 'ADMIN' && (
          <select className={styles.sel} value={outlet} onChange={e => setOutlet(e.target.value)}>
            <option value="all">All Outlets</option>
            <option value="1">Lagos Island</option>
            <option value="2">Surulere</option>
            <option value="3">Ikeja</option>
            <option value="4">Lekki Phase 1</option>
          </select>
        )}
        <select className={styles.sel} value={days} onChange={e => setDays(e.target.value)}>
          <option value="1">Today</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      <div className={styles.card}>
        {loading ? (
          <div className={styles.loadingWrap}><div className="spinner"/></div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyWrap}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--bdrm)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            <p>No transactions found</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.tbl}>
              <thead>
                <tr>
                  <th>Date & Time</th><th>Outlet</th><th>Amount (₦)</th>
                  <th>KG</th><th>Cyl. Size</th><th>Payment</th><th>Cylinder ID</th><th>TX ID</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => {
                  const pc = PAY_COLORS[t.paymentMethod] ?? { bg: '#f0f0f0', color: '#555' }
                  const smokeUsed = t.smokeUsed ?? 0
                  return (
                    <tr
                      key={t.id}
                      className={i % 2 ? styles.alt : ''}
                      onClick={() => setSelected(t)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div className={styles.dateCell}>{fmtD(t.createdAt)}</div>
                        <div className={styles.timeCell}>{fmtT(t.createdAt)}</div>
                      </td>
                      <td className={styles.bold}>{t.outlet?.name ?? '—'}</td>
                      <td className={styles.money}>
                        {fmt(t.naira)}
                        {smokeUsed > 0 && (
                          <span style={{
                            marginLeft: 5, fontSize: 10, background: 'rgba(255,140,0,0.12)',
                            color: '#FF8C00', padding: '1px 5px', borderRadius: 6, fontWeight: 700,
                          }}>
                            🔥 -{smokeUsed}
                          </span>
                        )}
                      </td>
                      <td className={styles.mono}>{fmtKg(t.kg)}</td>
                      <td><span className={styles.sizeBadge}>{t.cylinderSize}kg</span></td>
                      <td>
                        <span style={{ background: pc.bg, color: pc.color, padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: 'var(--fl),sans-serif' }}>
                          {t.paymentMethod === 'POS_TERMINAL' ? 'POS' : t.paymentMethod === 'TRANSFER' ? 'Transfer' : 'Cash'}
                        </span>
                      </td>
                      <td>
                        {t.cylinderId
                          ? <span className={styles.cylId}>{t.cylinderId}</span>
                          : <span className={styles.anon}>Walk-in</span>}
                      </td>
                      <td className={`${styles.mono} ${styles.dim}`}>{t.id.slice(0,10).toUpperCase()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
