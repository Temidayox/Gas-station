'use client'
import { useState, useEffect } from 'react'
import { fmt } from '@/lib/utils'
import styles from './settings.module.css'

export default function SettingsPage() {
  const [price, setPrice]       = useState('')
  const [current, setCurrent]   = useState(1150)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [saveErr, setSaveErr]   = useState('')
  const [priceErr, setPriceErr] = useState('')

  useEffect(() => {
    fetch('/api/price').then(r => r.json()).then(d => {
      setCurrent(d.pricePerKg); setPrice(String(d.pricePerKg))
    })
  }, [])

  function validatePrice(val: string) {
    const n = parseFloat(val)
    if (!val || isNaN(n)) { setPriceErr('Enter a valid price'); return false }
    if (n < 100)           { setPriceErr('Price must be at least ₦100/kg'); return false }
    if (n > 50000)         { setPriceErr('Price seems unrealistically high'); return false }
    setPriceErr(''); return true
  }

  async function updatePrice() {
    if (!validatePrice(price)) return
    setSaving(true); setSaveErr('')
    try {
      const res = await fetch('/api/admin/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricePerKg: parseFloat(price) }),
      })
      if (res.ok) {
        setCurrent(parseFloat(price))
        setSaved(true)
        setTimeout(() => setSaved(false), 4000)
      } else {
        const d = await res.json()
        setSaveErr(d.error ?? 'Update failed')
      }
    } catch {
      setSaveErr('Network error — try again')
    } finally {
      setSaving(false)
    }
  }

  const DEMO_CREDS = [
    { role: 'Admin',      email: 'admin@gasstation.ng',   pw: 'Admin@2026',  color: '#0f5c2e' },
    { role: 'Outlet 1',   email: 'outlet1@gasstation.ng', pw: 'Outlet1@26',  color: '#1a7a3f' },
    { role: 'Outlet 2',   email: 'outlet2@gasstation.ng', pw: 'Outlet2@26',  color: '#1a7a3f' },
    { role: 'Outlet 3',   email: 'outlet3@gasstation.ng', pw: 'Outlet3@26',  color: '#22a050' },
    { role: 'Outlet 4',   email: 'outlet4@gasstation.ng', pw: 'Outlet4@26',  color: '#22a050' },
    { role: 'Customer A', email: 'demo.a@gasstation.ng',  pw: 'Demo@001',    color: '#c98700' },
    { role: 'Customer B', email: 'demo.b@gasstation.ng',  pw: 'Demo@002',    color: '#c98700' },
    { role: 'Customer C', email: 'demo.c@gasstation.ng',  pw: 'Demo@003',    color: '#c98700' },
  ]

  const STACK = [
    ['Framework',   'Next.js 14 (App Router)',        '#000'],
    ['Database',    'PostgreSQL via Supabase',         '#3ecf8e'],
    ['ORM',         'Prisma',                          '#5a67d8'],
    ['Auth',        'NextAuth.js — JWT, 8h sessions',  '#0070f3'],
    ['Realtime',    'Pusher WebSockets',               '#e60076'],
    ['Hosting',     'Vercel (Edge + Serverless)',       '#000'],
  ]

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Settings</h1>

      <div className={styles.layout}>
        <div className={styles.left}>
          {/* Pricing */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon} style={{background:'var(--gp)'}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--g)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
              </div>
              <div>
                <div className={styles.cardTitle}>Gas Price Rate</div>
                <div className={styles.cardSub}>Applies to all 4 outlets immediately</div>
              </div>
            </div>

            <div className={styles.currentRate}>
              <span className={styles.currentLabel}>Active Rate</span>
              <span className={styles.currentVal}>{fmt(current)}<span>/kg</span></span>
            </div>

            <div className={styles.field}>
              <label>New Rate (₦ per kg)</label>
              <div className={styles.inputRow}>
                <span className={styles.prefix}>₦</span>
                <input
                  className={`${styles.inp} ${priceErr ? styles.inpErr : ''}`}
                  type="number" value={price} min="100" step="50"
                  onChange={e => { setPrice(e.target.value); if (priceErr) validatePrice(e.target.value) }}
                />
              </div>
              {priceErr && <div className={styles.fieldErr}>{priceErr}</div>}
              {saveErr && <div className={styles.fieldErr}>{saveErr}</div>}
            </div>
            <p className={styles.hint}>
              Price updates push instantly to all POS terminals via WebSocket. Staff see the new rate immediately without refreshing.
            </p>
            <button
              className={`${styles.saveBtn} ${saved ? styles.saveBtnSuccess : ''}`}
              onClick={updatePrice}
              disabled={saving || !price}
            >
              {saved ? (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg> Rate Updated Live</>
              ) : saving ? 'Updating…' : 'Update Rate'}
            </button>
          </div>

          {/* Stack */}
          <div className={styles.card}>
            <div className={styles.cardTitle} style={{marginBottom:16}}>Tech Stack</div>
            {STACK.map(([l,v,col]) => (
              <div key={l} className={styles.stackRow}>
                <div className={styles.stackDot} style={{background: String(col)}} />
                <span className={styles.stackLabel}>{l}</span>
                <span className={styles.stackVal}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.right}>
          {/* Credentials */}
          <div className={styles.card}>
            <div className={styles.cardTitle} style={{marginBottom:16}}>Demo Credentials</div>
            <div className={styles.credList}>
              {DEMO_CREDS.map(c => (
                <div key={c.email} className={styles.cred}>
                  <div className={styles.credRole} style={{color:c.color}}>{c.role}</div>
                  <div className={styles.credLine}>
                    <span className={styles.credEmail}>{c.email}</span>
                    <span className={styles.credSep}>/</span>
                    <span className={styles.credPw}>{c.pw}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Outlet quick ref */}
          <div className={styles.card}>
            <div className={styles.cardTitle} style={{marginBottom:14}}>Outlet Reference</div>
            {[
              ['1','Lagos Island',  '₦500k target'],
              ['2','Surulere',      '₦400k target'],
              ['3','Ikeja',         '₦450k target'],
              ['4','Lekki Phase 1', '₦600k target'],
            ].map(([id,name,target]) => (
              <div key={id} className={styles.outletRow}>
                <div className={styles.outletNum}>{id}</div>
                <div>
                  <div className={styles.outletName}>{name}</div>
                  <div className={styles.outletTarget}>{target} daily</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
