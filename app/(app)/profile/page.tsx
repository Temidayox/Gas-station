'use client'
import { useEffect, useState } from 'react'
import { fmt, fmtKg, fmtD, fmtT } from '@/lib/utils'
import styles from './profile.module.css'

export default function ProfilePage() {
  const [data, setData]     = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  const [linking, setLinking]       = useState(false)
  const [linkId, setLinkId]         = useState('')
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkErr, setLinkErr]       = useState('')
  const [linkOk, setLinkOk]         = useState('')

  // Generate random color for user
  const getUserColor = (email: string) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FE9A0B',
      '#FFD93D', '#6BCF7F', '#C56CF0', '#FF6B9D', '#4A90E2',
      '#795548', '#FF9F40', '#A855F7', '#22C55E', '#EF4444'
    ]
    let hash = 0
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash)
      hash = hash & hash
    }
    return colors[Math.abs(hash) % colors.length]
  }

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile', { cache: 'no-store' })
      const d = await res.json()
      setData(d)
    } catch { setError('Failed to load profile') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchProfile() }, [])

  async function handleLinkCylinder() {
    if (!linkId.trim()) { setLinkErr('Enter a cylinder ID'); return }
    setLinkLoading(true); setLinkErr(''); setLinkOk('')
    try {
      const res = await fetch('/api/link-cylinder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cylinderId: linkId.trim() }),
      })
      const d = await res.json()
      if (res.ok) {
        setLinkOk(`Cylinder ${d.cylinderId} (${d.size}kg) linked successfully!`)
        setLinkId('')
        await fetchProfile()
        setTimeout(() => { setLinking(false); setLinkOk('') }, 2000)
      } else {
        setLinkErr(d.error ?? 'Link failed')
      }
    } catch { setLinkErr('Network error') }
    finally { setLinkLoading(false) }
  }

  if (loading) return (
    <div className={styles.loadingWrap}><div className="spinner" /><span>Loading…</span></div>
  )
  if (error) return <div className={styles.errorWrap}>{error}</div>
  if (!data) return null

  const user         = data?.user         ?? { name: '', email: '', phone: null }
  const cylinders    = data?.cylinders    ?? []
  const transactions = data?.transactions ?? []
  const stats        = data?.stats        ?? { totalSpend: 0, totalKg: 0, refillCount: 0, favOutlet: '—' }
  const monthlySpend = data?.monthlySpend ?? []
  const maxMonth = Math.max(...(monthlySpend ?? []).map((m: any) => m.value), 1)
  const initials = (user.name ?? 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const userColor = getUserColor(user.email)

  return (
    <div className={styles.wrap}>
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.avatar} style={{background: userColor}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" style={{margin: 'auto'}}>
              {/* Gas Cylinder Body */}
              <rect x="6" y="4" width="12" height="16" rx="2" fill="white"/>
              {/* Cylinder Top Valve */}
              <rect x="10" y="2" width="4" height="4" rx="1" fill="white"/>
              {/* Cylinder Handle */}
              <rect x="9" y="0" width="6" height="3" rx="1" fill="white"/>
              {/* Gas Flame Indicator */}
              <circle cx="12" cy="10" r="2" fill="currentColor" opacity="0.3"/>
              {/* Cylinder Lines for Detail */}
              <line x1="8" y1="8" x2="8" y2="16" stroke="currentColor" strokeWidth="0.5" opacity="0.2"/>
              <line x1="16" y1="8" x2="16" y2="16" stroke="currentColor" strokeWidth="0.5" opacity="0.2"/>
            </svg>
          </div>
          <div>
            <h1 className={styles.name}>{user.name}</h1>
            <div className={styles.contact}>
              <span>{user.email}</span>
              {user.phone && <><span className={styles.dot}>·</span><span>{user.phone}</span></>}
            </div>
            <div className={styles.memberBadge}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              Verified Customer
            </div>
          </div>
        </div>
      </div>

      <div className={`${styles.kpiRow} stagger`}>
        {[
          { label: 'Total Spent',      value: fmt(stats.totalSpend) },
          { label: 'Gas Purchased',    value: `${(stats.totalKg || 0).toFixed(1)} kg` },
          { label: 'Total Refills',    value: stats.refillCount },
          { label: 'Favourite Outlet', value: stats.favOutlet || '—' },
        ].map(({ label, value }, i) => (
          <div key={label} className={`${styles.kpi} fade-up`} style={{ animationDelay: `${i * 60}ms` }}>
            <div className={styles.kpiLabel}>{label}</div>
            <div className={styles.kpiVal}>{value}</div>
          </div>
        ))}
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Monthly Spend</div>
          <div className={styles.chartOuter}>
            <div className={styles.chart}>
              {(monthlySpend ?? []).map((m: any, i: number) => (
                <div key={i} className={styles.chartCol}>
                  {m.value > 0 && <div className={styles.barLabel}>₦{Math.round(m.value / 1000)}k</div>}
                  <div className={`${styles.bar} ${i === 5 ? styles.barActive : ''}`}
                    style={{ height: m.value > 0 ? `${(m.value / maxMonth) * 100}%` : '3%', minHeight: 4 }} />
                  <div className={styles.barLbl}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>
            My Cylinders <span className={styles.cardCount}>{cylinders.length}</span>
          </div>

          {cylinders.length === 0
            ? <div className={styles.cylEmpty}>No cylinders linked yet.</div>
            : cylinders.map((c: any) => (
                <div key={c.id} className={styles.cylCard}>
                  <div className={styles.cylCardTop}>
                    <div>
                      <div className={styles.cylIdBig}>{c.id}</div>
                      <div className={styles.cylLastFill}>
                        {c.lastFill ? `Last filled ${fmtD(c.lastFill)}` : 'Never filled'}
                        {c.outletName ? ` · ${c.outletName}` : ''}
                      </div>
                    </div>
                    <div className={styles.cylSizeBadge}>{c.size} kg</div>
                  </div>
                </div>
              ))
          }

          {!linking ? (
            <button className={styles.linkBtn} onClick={() => { setLinking(true); setLinkErr(''); setLinkOk('') }}>
              + Link Another Cylinder
            </button>
          ) : (
            <div className={styles.linkBox}>
              <div className={styles.linkBoxTitle}>Link a Cylinder</div>
              <input
                className={styles.linkInp}
                type="text"
                placeholder="e.g. GS00001"
                value={linkId}
                onChange={e => { setLinkId(e.target.value.toUpperCase()); setLinkErr('') }}
                style={{ textTransform: 'uppercase' }}
                autoFocus
              />
              {linkErr && <div className={styles.linkErr}>{linkErr}</div>}
              {linkOk  && <div className={styles.linkOk}>{linkOk}</div>}
              <div className={styles.linkBtns}>
                <button className={styles.linkSubmit} onClick={handleLinkCylinder} disabled={linkLoading}>
                  {linkLoading ? 'Linking…' : 'Link Cylinder'}
                </button>
                <button className={styles.linkCancel} onClick={() => { setLinking(false); setLinkId(''); setLinkErr('') }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>
          Refill History <span className={styles.cardCount}>{transactions.length}</span>
        </div>
        {transactions.length === 0 ? (
          <div className={styles.emptyState}>No refills recorded yet.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.tbl}>
              <thead>
                <tr><th>Date</th><th>Outlet</th><th>Amount Paid</th><th>Gas Received</th><th>Cylinder</th><th>Payment</th></tr>
              </thead>
              <tbody>
                {transactions.map((t: any, i: number) => (
                  <tr key={t.id} className={i % 2 ? styles.alt : ''}>
                    <td>
                      <div className={styles.txDate}>{fmtD(t.createdAt)}</div>
                      <div className={styles.txTime}>{fmtT(t.createdAt)}</div>
                    </td>
                    <td className={styles.bold}>{t.outlet?.name}</td>
                    <td className={styles.money}>{fmt(t.naira)}</td>
                    <td className={styles.mono}>{fmtKg(t.kg)}</td>
                    <td className={styles.cylId}>{t.cylinderId ?? '—'}</td>
                    <td><span className={styles.payBadge}>{t.paymentMethod?.replace('_', ' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}