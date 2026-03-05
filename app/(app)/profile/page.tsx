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
  const [showHistory, setShowHistory] = useState(false)

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
          <div className={styles.avatar} style={{background: 'white', border: `3px solid ${userColor}`}}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill={userColor} style={{margin: 'auto'}}>
              {/* Gas Cylinder Body */}
              <rect x="6" y="4" width="12" height="16" rx="2" fill={userColor}/>
              {/* Cylinder Top Valve */}
              <rect x="10" y="2" width="4" height="4" rx="1" fill={userColor}/>
              {/* Cylinder Handle */}
              <rect x="9" y="0" width="6" height="3" rx="1" fill={userColor}/>
              {/* Gas Flame Indicator */}
              <circle cx="12" cy="10" r="2" fill="white" opacity="0.3"/>
              {/* Cylinder Lines for Detail */}
              <line x1="8" y1="8" x2="8" y2="16" stroke="white" strokeWidth="0.5" opacity="0.2"/>
              <line x1="16" y1="8" x2="16" y2="16" stroke="white" strokeWidth="0.5" opacity="0.2"/>
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
        <div className={styles.heroRight}>
          <button className={styles.historyBtn} onClick={() => setShowHistory(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v6m0 4v6m0-4l-2-2m2 2l2-2M3 12h6m4 0h6m-4 0l2-2m-2 2l-2-2"/>
              <circle cx="12" cy="12" r="10"/>
            </svg>
            History
          </button>
        </div>
      </div>

      {/* Smoke Balance */}
      <div className={styles.smokeBalance}>
        <div className={styles.smokeIcon}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 15c-1.66 0-3-1.34-3-3 0-1.31.84-2.41 2-2.83V7c0-1.1.9-2 2-2s2 .9 2 2v2.17c1.16.42 2 1.52 2 2.83 0 1.66-1.34 3-3 3zm10 0c-1.66 0-3-1.34-3-3 0-1.31.84-2.41 2-2.83V7c0-1.1.9-2 2-2s2 .9 2 2v2.17c1.16.42 2 1.52 2 2.83 0 1.66-1.34 3-3 3z"/>
          </svg>
        </div>
        <div className={styles.smokeInfo}>
          <div className={styles.smokeLabel}>Smoke Balance</div>
          <div className={styles.smokeAmount}>{user.smokeBalance || 0}</div>
        </div>
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

      {/* History Modal */}
      {showHistory && (
        <div className={styles.modalOverlay} onClick={() => setShowHistory(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Purchase History</h2>
              <button className={styles.modalClose} onClick={() => setShowHistory(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            <div className={styles.historyStats}>
              {[
                { label: 'Total Spent', value: fmt(stats.totalSpend) },
                { label: 'Gas Purchased', value: `${(stats.totalKg || 0).toFixed(1)} kg` },
                { label: 'Total Refills', value: stats.refillCount },
                { label: 'Favourite Outlet', value: stats.favOutlet || '—' },
              ].map(({ label, value }) => (
                <div key={label} className={styles.historyStat}>
                  <div className={styles.historyStatLabel}>{label}</div>
                  <div className={styles.historyStatValue}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}