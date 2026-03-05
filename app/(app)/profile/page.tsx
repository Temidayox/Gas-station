'use client'
import { useEffect, useState } from 'react'
import { fmt, fmtKg, fmtD, fmtT } from '@/lib/utils'
import styles from './profile.module.css'

function ReceiptModal({ tx, onClose }: { tx: any; onClose: () => void }) {
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

        <div style={{ borderTop: '1px solid var(--bdr)', paddingTop: 16 }}>
          {[
            ['TX ID', tx.id.slice(0, 16).toUpperCase()],
            ['Outlet', tx.outlet?.name ?? '—'],
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
              padding: '7px 0', borderBottom: '1px solid var(--bdr)', fontSize: 13,
            }}>
              <span style={{ color: 'var(--inks)' }}>{label}</span>
              <span style={{
                fontWeight: 600,
                color: label === '🔥 Smoke Used' ? '#FF8C00' : 'var(--ink)',
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

export default function ProfilePage() {
  const [data, setData]     = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')
  const [selected, setSelected] = useState<any>(null)

  const [linking, setLinking]       = useState(false)
  const [linkId, setLinkId]         = useState('')
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkErr, setLinkErr]       = useState('')
  const [linkOk, setLinkOk]         = useState('')

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
  const userColor = getUserColor(user.email)

  return (
    <div className={styles.wrap}>
      {selected && <ReceiptModal tx={selected} onClose={() => setSelected(null)} />}

      <div className={styles.hero} style={{background:`linear-gradient(135deg, ${userColor}15 0%, ${userColor}05 100%)`, border:`1px solid ${userColor}25`, borderRadius:16, animation:"heroIn 0.6s ease forwards"}} >
        <div className={styles.heroLeft}>
          <div className={styles.avatarArea}>
            <div className={styles.avatar} style={{background: 'white', border: `3px solid ${userColor}`}}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill={userColor} style={{margin: 'auto'}}>
                <rect x="6" y="4" width="12" height="16" rx="2" fill={userColor}/>
                <rect x="10" y="2" width="4" height="4" rx="1" fill={userColor}/>
                <rect x="9" y="0" width="6" height="3" rx="1" fill={userColor}/>
                <circle cx="12" cy="10" r="2" fill="white" opacity="0.3"/>
                <line x1="8" y1="8" x2="8" y2="16" stroke="white" strokeWidth="0.5" opacity="0.2"/>
                <line x1="16" y1="8" x2="16" y2="16" stroke="white" strokeWidth="0.5" opacity="0.2"/>
              </svg>
            </div>
            
          </div>
          <div>
            <h1 className={styles.name} style={{animation:"slideUp 0.5s ease 0.1s both"}}>{user.name}</h1>
            <div className={styles.contact} style={{animation:"slideUp 0.5s ease 0.2s both"}}>
              <span>{user.email}</span>
              {user.phone && <><span className={styles.dot}>·</span><span>{user.phone}</span></>}
            </div>
          </div>
        </div>
      </div>

      {/* Smoke Balance */}
      <div className={styles.smokeBalance}>
        <div className={styles.campfireBg}>
          <div className={styles.flames}>
            {[...Array(5)].map((_, i) => <div key={i} className={styles.flame}></div>)}
          </div>
          <div className={styles.smoke}>
            {[...Array(5)].map((_, i) => <div key={i} className={styles.smokeParticle}></div>)}
          </div>
        </div>
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
          <div style={{ padding: "8px 0 4px", height: 160 }}>
            {(() => {
              const W = 320, H = 100, pad = 24
              const vals = (monthlySpend ?? []).map((m: any) => m.value)
              const max = Math.max(...vals, 1)
              const pts = vals.map((v: number, i: number) => ({
                x: pad + (i / (vals.length - 1)) * (W - pad * 2),
                y: v === 0 ? H - pad : H - pad - ((v / max) * (H - pad * 2)),
                v
              }))
              const polyline = pts.map((p: any) => `${p.x},${p.y}`).join(" ")
              const area = `${pts[0].x},${H - pad} ` + pts.map((p: any) => `${p.x},${p.y}`).join(" ") + ` ${pts[pts.length-1].x},${H - pad}`
              return (
                <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 150, overflow: "visible" }} preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2d7a3a" stopOpacity={0.4}/>
                      <stop offset="100%" stopColor="#2d7a3a" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  {[0.25, 0.5, 0.75, 1].map((t: number) => (
                    <line key={t} x1={pad} x2={W - pad} y1={H - pad - t * (H - pad * 2)} y2={H - pad - t * (H - pad * 2)} stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="2,3"/>
                  ))}
                  <polygon points={area} fill="url(#lineGrad)" opacity="0.6"/>
                  <polyline points={polyline} fill="none" stroke="#2d7a3a" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
                  {pts.map((p: any, i: number) => (
                    <g key={i}>
                      
                      {p.v > 0 && <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="9" fill="#2d7a3a" fontWeight="700">&#8358;{Math.round(p.v / 1000)}k</text>}
                      <text x={p.x} y={H - 6} textAnchor="middle" fontSize="10" fill="#6b7280">{(monthlySpend ?? [])[i]?.label}</text>
                    </g>
                  ))}
                </svg>
              )
            })()}
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
                placeholder="e.g. 0XIEQ"
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
        <div style={{ fontSize: 11, color: 'var(--inks)', marginBottom: 10 }}>Click any row to view receipt</div>
        {transactions.length === 0 ? (
          <div className={styles.emptyState}>No refills recorded yet.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.tbl}>
              <thead>
                <tr><th>Date</th><th>Outlet</th><th>Amount Paid</th><th>Gas Received</th><th>Cylinder</th><th>Payment</th></tr>
              </thead>
              <tbody>
                {transactions.map((t: any, i: number) => {
                  const smokeUsed = t.smokeUsed ?? 0
                  return (
                    <tr
                      key={t.id}
                      className={i % 2 ? styles.alt : ''}
                      onClick={() => setSelected(t)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div className={styles.txDate}>{fmtD(t.createdAt)}</div>
                        <div className={styles.txTime}>{fmtT(t.createdAt)}</div>
                      </td>
                      <td className={styles.bold}>{t.outlet?.name}</td>
                      <td className={styles.money}>
                        {fmt(t.naira)}
                        {smokeUsed > 0 && (
                          <span style={{
                            marginLeft: 5, fontSize: 10,
                            background: 'rgba(255,140,0,0.12)',
                            color: '#FF8C00', padding: '1px 5px',
                            borderRadius: 6, fontWeight: 700,
                          }}>
                            🔥 -{smokeUsed}
                          </span>
                        )}
                      </td>
                      <td className={styles.mono}>{fmtKg(t.kg)}</td>
                      <td className={styles.cylId}>{t.cylinderId ?? '—'}</td>
                      <td><span className={styles.payBadge}>{t.paymentMethod?.replace('_', ' ')}</span></td>
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









