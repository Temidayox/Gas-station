'use client'
import { useEffect, useState, useCallback } from 'react'
import { fmt, fmtKg } from '@/lib/utils'
import { getSession } from 'next-auth/react'
import styles from './outlets.module.css'

export default function OutletsPage() {
  const [outlets, setOutlets]     = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [selected, setSelected]   = useState<any>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [session, setSession]     = useState<any>(null)
  const [editingStaff, setEditingStaff] = useState<any>(null)
  const [showStaffEdit, setShowStaffEdit] = useState(false)
  const [staffForm, setStaffForm] = useState({
    email: '',
    name: '',
    role: 'OUTLET_STAFF' as 'ADMIN' | 'OUTLET_STAFF',
    outletId: ''
  })

  const [form, setForm] = useState({ name: '', location: '', dailyTarget: '400000', tankCapacityKg: '2000' })
  const [creating, setCreating]   = useState(false)
  const [createErr, setCreateErr] = useState('')

  const fetchOutlets = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/outlets', { cache: 'no-store' })
      const d = await res.json()
      setOutlets(Array.isArray(d) ? d : [])
      if (selected) {
        const fresh = d.find((o: any) => o.id === selected.id)
        if (fresh) setSelected(fresh)
      }
    } catch { setOutlets([]) }
    finally { setLoading(false) }
  }, [selected?.id])

  useEffect(() => { 
    const loadSession = async () => {
      try {
        const sessionData = await getSession()
        setSession(sessionData)
      } catch (error) {
        console.error('Error loading session:', error)
        setSession(null)
      } finally {
        setSessionLoading(false)
      }
    }
    loadSession()
    fetchOutlets() 
  }, [])

  async function createOutlet() {
    if (!form.name.trim() || !form.location.trim()) { setCreateErr('Name and location are required'); return }
    setCreating(true); setCreateErr('')
    try {
      const res = await fetch('/api/admin/outlets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await res.json()
      if (res.ok) {
        setShowCreate(false)
        setForm({ name: '', location: '', dailyTarget: '400000', tankCapacityKg: '2000' })
        await fetchOutlets()
      } else { setCreateErr(d.error ?? 'Failed to create outlet') }
    } catch { setCreateErr('Network error') }
    finally { setCreating(false) }
  }

  async function handleStaffEdit(e: React.FormEvent) {
    e.preventDefault()
    
    try {
      const url = editingStaff ? '/api/admin/staff' : '/api/admin/staff'
      const method = editingStaff ? 'PUT' : 'POST'
      
      const payload = editingStaff 
        ? { ...staffForm, id: editingStaff.id }
        : staffForm

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save staff member')
      }

      // Refresh outlets data to get updated staff
      await fetchOutlets()
      
      // Reset form
      setShowStaffEdit(false)
      setEditingStaff(null)
      setStaffForm({
        email: '',
        name: '',
        role: 'OUTLET_STAFF',
        outletId: ''
      })

      // Show appropriate message based on response
      alert(data.message || (editingStaff ? 'Staff member updated successfully!' : 'Staff member added successfully!'))
    } catch (error) {
      console.error('Error saving staff member:', error)
      alert(error instanceof Error ? error.message : 'Failed to save staff member')
    }
  }

  function editStaffMember(staffMember: any) {
    setEditingStaff(staffMember)
    setStaffForm({
      email: staffMember.email,
      name: staffMember.name,
      role: staffMember.role,
      outletId: staffMember.outletId?.toString() || ''
    })
    setShowStaffEdit(true)
  }

  if (loading || sessionLoading) return <div className={styles.loading}><div className="spinner" /></div>

  if (selected) {
    const o = selected
    const tankPct = o.tankPct ?? 0
    const tankLow = tankPct < 20
    const tankWarn = tankPct < 40

    return (
      <div className={styles.wrap}>
        <div className={styles.detailHeader}>
          <button className={styles.backBtn} onClick={() => setSelected(null)}>← Back to Outlets</button>
          <span className={styles.activeBadge}>{o.isActive ? 'Active' : 'Inactive'}</span>
        </div>
        <div className={styles.detailTop}>
          <div>
            <h1 className={styles.detailTitle}>{o.name}</h1>
            <div className={styles.detailLoc}>📍 {o.location}</div>
          </div>
          <button className={styles.refreshBtn} onClick={fetchOutlets}>↻ Refresh</button>
        </div>
        <div className={styles.kpiGrid}>
          {[
            ['Revenue Today',  fmt(o.rev),              `Target: ${fmt(o.dailyTarget)}`],
            ['KG Dispensed',   `${(o.kg||0).toFixed(1)} kg`, 'Today'],
            ['Transactions',   o.count,                 `${o.linked} linked`],
            ['Target %',       `${o.pct}%`,             o.pct >= 100 ? '🎉 Hit!' : `${fmt(o.dailyTarget - o.rev)} to go`],
          ].map(([l,v,s]) => (
            <div key={String(l)} className={styles.kpi}>
              <div className={styles.kpiLabel}>{l}</div>
              <div className={styles.kpiVal}>{v}</div>
              <div className={styles.kpiSub}>{s}</div>
            </div>
          ))}
        </div>
        <div className={`${styles.tankCard} ${tankLow ? styles.tankRed : tankWarn ? styles.tankAmber : ''}`}>
          <div className={styles.tankLeft}>
            <div className={styles.tankHeading}>
              {tankLow ? '⚠ TANK CRITICALLY LOW' : tankWarn ? '⚠ Tank Low' : '⛽ Tank Level'}
            </div>
            <div className={styles.tankNums}>
              <span className={styles.tankCur}>{(o.tankCurrentKg||0).toFixed(0)} kg</span>
              <span className={styles.tankOf}>/ {(o.tankCapacityKg||0).toFixed(0)} kg</span>
            </div>
          </div>
          <div className={styles.tankBarWrap}>
            <div className={styles.tankTrack}>
              <div className={styles.tankFill} style={{
                width: `${tankPct}%`,
                background: tankLow ? 'var(--rd)' : tankWarn ? 'var(--am)' : 'var(--gl)'
              }} />
            </div>
            <span className={styles.tankPct}>{tankPct}%</span>
          </div>
        </div>
        <div className={styles.twoCol}>
          <div className={styles.card}>
            <div className={styles.cardTitle}>7-Day Revenue Trend</div>
            <div className={styles.bars}>
              {(o.weekData ?? []).map((v: number, i: number) => {
                const max = Math.max(...(o.weekData ?? []), 1)
                const day = new Date(Date.now() - (6-i)*86400000)
                const lbl = day.toLocaleDateString('en-NG', { weekday: 'short' })
                return (
                  <div key={i} className={styles.barCol}>
                    <div className={styles.barFill} style={{ height: v > 0 ? `${Math.max((v/max)*80,4)}px` : '4px', background: i===6?'var(--g)':'var(--gl)', opacity: 0.5+(i/6)*0.5 }} />
                    <span className={styles.barLbl}>{lbl}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Payment Mix (Today)</div>
            {o.payTotals && ([['Cash','CASH','var(--g)'],['Transfer','TRANSFER','var(--am)'],['POS Card','POS_TERMINAL','#1a73e8']] as const).map(([lbl,key,col]) => {
              const total = Object.values(o.payTotals).reduce((s: number, v: any) => s + v, 0) || 1
              const val = o.payTotals[key] ?? 0
              return (
                <div key={key} className={styles.payRow}>
                  <div className={styles.payTop}><span>{lbl}</span><span style={{color:col,fontWeight:700}}>{Math.round((val/total)*100)}%</span></div>
                  <div className={styles.payTrack}><div style={{width:`${(val/total)*100}%`,background:col,height:'100%',borderRadius:3}} /></div>
                </div>
              )
            })}
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Staff ({(o.staff??[]).length})</div>
          {(o.staff??[]).length === 0 ? (
            <div>
              <div className={styles.empty}>No staff assigned yet.</div>
              {!sessionLoading && session?.user?.role === 'ADMIN' && (
                <div style={{marginTop: '16px', textAlign: 'center'}}>
                  <button 
                    className={styles.editBtn}
                    onClick={() => {
                      // Create a new staff member for this outlet
                      setStaffForm({
                        email: '',
                        name: '',
                        role: 'OUTLET_STAFF',
                        outletId: o.id.toString()
                      })
                      setEditingStaff(null)
                      setShowStaffEdit(true)
                    }}
                    style={{padding: '8px 16px', fontSize: '12px'}}
                  >
                    + Add Staff Member
                  </button>
                </div>
              )}
            </div>
          ) : (
            <table className={styles.tbl}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  {!sessionLoading && session?.user?.role === 'ADMIN' && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {(o.staff??[]).map((s: any, i: number) => (
                  <tr key={s.id} className={i%2?styles.alt:''}>
                    <td className={styles.bold}>{s.name}</td>
                    <td className={styles.muted}>{s.email}</td>
                    <td><span className={styles.roleBadge}>{s.role.replace('_',' ')}</span></td>
                    {!sessionLoading && session?.user?.role === 'ADMIN' && (
                      <td>
                        <button 
                          className={styles.editBtn}
                          onClick={() => editStaffMember(s)}
                        >
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Recent Tank Refills</div>
          {(o.recentRefills??[]).length === 0
            ? <div className={styles.empty}>No tank refills recorded.</div>
            : <table className={styles.tbl}>
                <thead><tr><th>Date</th><th>Added</th><th>Before</th><th>After</th><th>By</th></tr></thead>
                <tbody>
                  {(o.recentRefills??[]).map((r: any, i: number) => (
                    <tr key={r.id} className={i%2?styles.alt:''}>
                      <td className={styles.muted}>{new Date(r.createdAt).toLocaleDateString('en-NG')}</td>
                      <td className={styles.bold} style={{color:'var(--g)'}}>+{r.addedKg.toFixed(0)} kg</td>
                      <td className={styles.muted}>{r.beforeKg.toFixed(0)} kg</td>
                      <td className={styles.muted}>{r.afterKg.toFixed(0)} kg</td>
                      <td>{r.staff?.name ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
          }
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Outlet Management</h1>
          <div className={styles.sub}>{outlets.length} outlets · click any outlet to see full details</div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button className={styles.refreshBtn} onClick={fetchOutlets}>↻ Refresh</button>
          <button className={styles.createBtn} onClick={() => setShowCreate(true)}>+ New Outlet</button>
        </div>
      </div>
      {showCreate && (
        <div className={styles.createCard}>
          <div className={styles.createHead}>
            <span>Create New Outlet</span>
            <button className={styles.closeBtn} onClick={() => { setShowCreate(false); setCreateErr('') }}>×</button>
          </div>
          <div className={styles.createGrid}>
            <div className={styles.createField}>
              <label>Outlet Name *</label>
              <input className={styles.createInp} placeholder="e.g. Victoria Island" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
            </div>
            <div className={styles.createField}>
              <label>Location *</label>
              <input className={styles.createInp} placeholder="e.g. Victoria Island, Lagos" value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} />
            </div>
            <div className={styles.createField}>
              <label>Daily Target (₦)</label>
              <input className={styles.createInp} type="number" value={form.dailyTarget} onChange={e => setForm(f => ({...f, dailyTarget: e.target.value}))} />
            </div>
            <div className={styles.createField}>
              <label>Tank Capacity (kg)</label>
              <input className={styles.createInp} type="number" value={form.tankCapacityKg} onChange={e => setForm(f => ({...f, tankCapacityKg: e.target.value}))} />
            </div>
          </div>
          {createErr && <div className={styles.createErr}>{createErr}</div>}
          <div className={styles.createBtns}>
            <button className={styles.createSubmit} onClick={createOutlet} disabled={creating}>{creating ? 'Creating…' : 'Create Outlet'}</button>
            <button className={styles.createCancel} onClick={() => { setShowCreate(false); setCreateErr('') }}>Cancel</button>
          </div>
        </div>
      )}
      
      {showStaffEdit && (
        <div className={styles.createCard}>
          <div className={styles.createHead}>
            <span>{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</span>
            <button className={styles.closeBtn} onClick={() => { 
              setShowStaffEdit(false)
              setEditingStaff(null)
              setStaffForm({
                email: '',
                name: '',
                role: 'OUTLET_STAFF',
                outletId: ''
              })
            }}>×</button>
          </div>
          <form onSubmit={handleStaffEdit} className={styles.createGrid}>
            <div className={styles.createField}>
              <label>Email Address</label>
              <input 
                className={styles.createInp} 
                type="email"
                placeholder="staff@gmail.com" 
                value={staffForm.email} 
                onChange={e => setStaffForm(f => ({...f, email: e.target.value}))} 
                required
              />
            </div>
            <div className={styles.createField}>
              <label>Full Name</label>
              <input 
                className={styles.createInp} 
                placeholder="John Doe" 
                value={staffForm.name} 
                onChange={e => setStaffForm(f => ({...f, name: e.target.value}))} 
                required
              />
            </div>
            <div className={styles.createField}>
              <label>Role</label>
              <select
                className={styles.createInp}
                value={staffForm.role}
                onChange={e => setStaffForm(f => ({...f, role: e.target.value as 'ADMIN' | 'OUTLET_STAFF'}))}
              >
                <option value="OUTLET_STAFF">Outlet Staff</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            {staffForm.role === 'OUTLET_STAFF' && (
              <div className={styles.createField}>
                <label>Assigned Outlet</label>
                <select
                  className={styles.createInp}
                  value={staffForm.outletId}
                  onChange={e => setStaffForm(f => ({...f, outletId: e.target.value}))}
                  required
                >
                  <option value="">Select Outlet</option>
                  {outlets.map(outlet => (
                    <option key={outlet.id} value={outlet.id.toString()}>
                      {outlet.name} - {outlet.location}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </form>
          <div className={styles.createBtns}>
            <button type="button" className={styles.createSubmit} onClick={handleStaffEdit}>
              {editingStaff ? 'Update Staff Member' : 'Add Staff Member'}
            </button>
            <button type="button" className={styles.createCancel} onClick={() => { 
              setShowStaffEdit(false)
              setEditingStaff(null)
              setStaffForm({
                email: '',
                name: '',
                role: 'OUTLET_STAFF',
                outletId: ''
              })
            }}>Cancel</button>
          </div>
        </div>
      )}
      
      <div className={styles.grid}>
        {outlets.map(o => {
          const tankLow  = o.tankPct < 20
          const tankWarn = o.tankPct < 40
          return (
            <div key={o.id} className={styles.card} onClick={() => setSelected(o)} role="button" tabIndex={0} onKeyDown={e => e.key==='Enter' && setSelected(o)}>
              <div className={styles.cardTop}>
                <div>
                  <div className={styles.name}>{o.name}</div>
                  <div className={styles.loc}>📍 {o.location}</div>
                </div>
                <span className={styles.activeBadge}>Active</span>
              </div>
              <div className={styles.statsGrid}>
                {[['Revenue',fmt(o.rev)],['KG',`${(o.kg||0).toFixed(1)} kg`],['Sales',o.count]].map(([l,v]) => (
                  <div key={String(l)} className={styles.stat}><div className={styles.statLabel}>{l}</div><div className={styles.statVal}>{v}</div></div>
                ))}
              </div>
              <div className={styles.miniTankRow}>
                <span className={`${styles.miniTankLabel} ${tankLow?styles.red:tankWarn?styles.amber:''}`}>
                  ⛽ {tankLow?'CRITICAL':tankWarn?'Low':'Tank'}
                </span>
                <div className={styles.miniTankTrack}>
                  <div style={{ width:`${o.tankPct}%`, height:'100%', borderRadius:3, background: tankLow?'var(--rd)':tankWarn?'var(--am)':'var(--gl)', transition:'width .5s ease' }} />
                </div>
                <span className={`${styles.miniTankPct} ${tankLow?styles.red:tankWarn?styles.amber:''}`}>{o.tankPct}%</span>
              </div>
              <div className={styles.progLabel}><span>Daily target</span><span>{o.pct}%</span></div>
              <div className={styles.progTrack}>
                <div style={{ width:`${o.pct}%`, height:'100%', borderRadius:3, background: o.pct>=80?'var(--gl)':o.pct>=40?'var(--am)':'var(--rd)' }} />
              </div>
              <div className={styles.viewHint}>Click to view full details →</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}