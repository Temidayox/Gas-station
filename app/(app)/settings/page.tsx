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
  
  // Admin management states
  const [adminUsers, setAdminUsers] = useState<any[]>([])
  const [newAdmin, setNewAdmin] = useState({ email: '', role: 'ADMIN', outletId: null })
  const [showAddForm, setShowAddForm] = useState(false)
  const [adminSaving, setAdminSaving] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    fetch('/api/price').then(r => r.json()).then(d => {
      setCurrent(d.pricePerKg); setPrice(String(d.pricePerKg))
    })
    
    // Fetch admin users
    fetch('/api/admin/users').then(r => r.json()).then(d => {
      if (d.users) setAdminUsers(d.users)
    }).catch(() => {
      // If API doesn't exist, use hardcoded admin
      setAdminUsers([
        { id: 1, email: 'dtemidayo825@gmail.com', role: 'ADMIN', outletId: null, createdAt: new Date() }
      ])
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

  async function addAdminUser() {
    if (!newAdmin.email) return
    
    setAdminSaving(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdmin),
      })
      
      if (res.ok) {
        const user = await res.json()
        setAdminUsers([...adminUsers, user])
        setNewAdmin({ email: '', role: 'ADMIN', outletId: null })
        setShowAddForm(false)
      } else {
        const d = await res.json()
        alert(d.error || 'Failed to add admin user')
      }
    } catch {
      alert('Network error — try again')
    } finally {
      setAdminSaving(false)
    }
  }

  async function removeAdminUser(userId: number) {
    if (!confirm('Are you sure you want to remove this admin user?')) return
    
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })
      
      if (res.ok) {
        setAdminUsers(adminUsers.filter(u => u.id !== userId))
      } else {
        alert('Failed to remove admin user')
      }
    } catch {
      alert('Network error — try again')
    }
  }

  async function resetAllData() {
    if (!confirm('⚠️ WARNING: This will reset ALL system data except customer information!\n\nThis includes:\n• All transactions\n• All tank refills\n• All cylinder links\n• All outlet data\n• All price history\n\nCustomer accounts and their data will be preserved.\n\nThis action cannot be undone!')) return
    
    setResetting(true)
    try {
      const res = await fetch('/api/admin/reset-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      if (res.ok) {
        alert('✅ All system data has been reset successfully!\n\nCustomer data has been preserved.')
        // Refresh current price
        fetch('/api/price').then(r => r.json()).then(d => {
          setCurrent(d.pricePerKg); setPrice(String(d.pricePerKg))
        })
      } else {
        const d = await res.json()
        alert(`❌ Reset failed: ${d.error || 'Unknown error'}`)
      }
    } catch {
      alert('❌ Network error — please try again')
    } finally {
      setResetting(false)
    }
  }

  const STACK = [
    ['Framework',   'Next.js 14 (App Router)',        '#000'],
    ['Database',    'PostgreSQL via Supabase',         '#3ecf8e'],
    ['ORM',         'Prisma',                          '#5a67d8'],
    ['Auth',        'NextAuth.js — Google OAuth',       '#0070f3'],
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
          {/* Admin User Management */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon} style={{background:'var(--am)'}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--am)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 0 4 4 0 000 8z"/></svg>
              </div>
              <div>
                <div className={styles.cardTitle}>Admin User Management</div>
                <div className={styles.cardSub}>Manage Gmail accounts with admin access</div>
              </div>
            </div>

            {/* Add Admin Form */}
            {!showAddForm ? (
              <button 
                className={styles.saveBtn} 
                style={{marginBottom: 16, background: 'var(--am)'}}
                onClick={() => setShowAddForm(true)}
              >
                + Add Admin User
              </button>
            ) : (
              <div style={{background: 'var(--surf)', padding: 16, borderRadius: 'var(--r)', marginBottom: 16}}>
                <div className={styles.field}>
                  <label>Gmail Address</label>
                  <input
                    className={styles.inp}
                    type="email"
                    placeholder="admin@company.com"
                    value={newAdmin.email}
                    onChange={e => setNewAdmin({...newAdmin, email: e.target.value})}
                    style={{padding: '12px 14px'}}
                  />
                </div>
                
                <div className={styles.field}>
                  <label>Role</label>
                  <select 
                    className={styles.inp}
                    value={newAdmin.role}
                    onChange={e => setNewAdmin({...newAdmin, role: e.target.value})}
                    style={{padding: '12px 14px'}}
                  >
                    <option value="ADMIN">Super Admin</option>
                    <option value="OUTLET_STAFF">Outlet Staff</option>
                  </select>
                </div>

                <div style={{display: 'flex', gap: 8}}>
                  <button 
                    className={styles.saveBtn}
                    onClick={addAdminUser}
                    disabled={adminSaving || !newAdmin.email}
                  >
                    {adminSaving ? 'Adding…' : 'Add User'}
                  </button>
                  <button 
                    className={styles.saveBtn}
                    style={{background: 'var(--surf)', color: 'var(--ink)', border: '1px solid var(--bdr)'}}
                    onClick={() => {
                      setShowAddForm(false)
                      setNewAdmin({ email: '', role: 'ADMIN', outletId: null })
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Admin Users List */}
            <div className={styles.credList}>
              {adminUsers.map(user => (
                <div key={user.id} className={styles.cred}>
                  <div className={styles.credRole} style={{color: user.role === 'ADMIN' ? 'var(--g)' : 'var(--am)'}}>
                    {user.role === 'ADMIN' ? '👑 Super Admin' : '⛽ Outlet Staff'}
                  </div>
                  <div className={styles.credLine}>
                    <span className={styles.credEmail}>{user.email}</span>
                    {user.outletId && <span className={styles.credSep}>• Outlet {user.outletId}</span>}
                  </div>
                  {user.email !== 'dtemidayo825@gmail.com' && (
                    <button 
                      className={styles.saveBtn}
                      style={{marginTop: 8, padding: '6px 12px', fontSize: 11, background: 'var(--rd)'}}
                      onClick={() => removeAdminUser(user.id)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>

            <p className={styles.hint} style={{marginTop: 16}}>
              <strong>How it works:</strong><br/>
              • Add Gmail addresses that should have admin access<br/>
              • Users sign in with Google OAuth using these emails<br/>
              • Super Admins get full system access<br/>
              • Outlet Staff get access to assigned outlet only<br/>
              • Changes sync immediately across all devices
            </p>
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

          {/* Reset Data */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon} style={{background:'var(--rd)'}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--rd)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M3 12h18M8 12v4a2 2 0 01-2 2h4a2 2 0 01-2-2v-2M3 18h18"/></svg>
              </div>
              <div>
                <div className={styles.cardTitle}>System Reset</div>
                <div className={styles.cardSub}>Reset all data except customer information</div>
              </div>
            </div>
            
            <button
              className={`${styles.saveBtn} ${styles.resetBtn}`}
              onClick={resetAllData}
              disabled={resetting}
              style={{background: 'var(--rd)', marginBottom: 0}}
            >
              {resetting ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4v16M12 4v16M20 4v16"/></svg> Resetting…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M3 12h18M8 12v4a2 2 0 01-2 2h4a2 2 0 01-2-2v-2M3 18h18"/></svg> Reset All Data
                </>
              )}
            </button>
            
            <p className={styles.hint} style={{marginTop: 12, color: 'var(--rd)', fontSize: '11px'}}>
              <strong>⚠️ Critical Action:</strong><br/>
              • Resets all transactions, refills, and outlet data<br/>
              • Preserves customer accounts and their information<br/>
              • Cannot be undone - use with extreme caution
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
