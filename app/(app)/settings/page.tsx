'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { signOut } from 'next-auth/react'
import styles from './settings.module.css'

export default function SettingsPage() {
  const { data: session } = useSession()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // User settings states
  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  
  // Admin settings states
  const [price, setPrice] = useState('')
  const [current, setCurrent] = useState(1150)
  const [saved, setSaved] = useState(false)
  const [saveErr, setSaveErr] = useState('')
  const [priceErr, setPriceErr] = useState('')
  
  // Admin management states
  const [adminUsers, setAdminUsers] = useState<any[]>([])
  const [newAdmin, setNewAdmin] = useState({ email: '', role: 'ADMIN', outletId: null })
  const [showAddForm, setShowAddForm] = useState(false)
  const [adminSaving, setAdminSaving] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    if (session?.user) {
      setUser(session.user)
      setUsername(session.user.username || '')
      
      if (session.user.role === 'ADMIN') {
        // Load admin settings
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
      }
    }
    setLoading(false)
  }, [session])

  // User settings functions
  async function updateUsername() {
    if (!username.trim()) {
      setSaveMessage('Username cannot be empty')
      return
    }

    setSaving(true)
    setSaveMessage('')

    try {
      const res = await fetch('/api/user/username', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() })
      })

      const data = await res.json()

      if (res.ok) {
        setSaveMessage('Username updated successfully!')
        setUser((prev: any) => ({ ...prev, username: username.trim() }))
      } else {
        setSaveMessage(data.error || 'Failed to update username')
      }
    } catch (error) {
      setSaveMessage('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteAccount() {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data including transaction history and linked cylinders.')) {
      return
    }

    if (!confirm('This is your final warning. All your data will be permanently deleted. Are you absolutely sure?')) {
      return
    }

    setDeleteLoading(true)

    try {
      const res = await fetch('/api/user/delete', {
        method: 'DELETE'
      })

      if (res.ok) {
        await signOut({ callbackUrl: '/login' })
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete account')
      }
    } catch (error) {
      alert('Network error. Please try again.')
    } finally {
      setDeleteLoading(false)
    }
  }

  // Admin settings functions
  async function savePrice() {
    const p = parseFloat(price)
    if (!p || p < 0) { setPriceErr('Enter a valid price'); return }
    setSaving(true); setSaveErr(''); setSaved(false)
    try {
      const res = await fetch('/api/price', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pricePerKg: p }) })
      if (res.ok) { setSaved(true); setCurrent(p); setTimeout(() => setSaved(false), 2000) }
      else { const d = await res.json(); setSaveErr(d.error ?? 'Failed') }
    } catch { setSaveErr('Network error') }
    finally { setSaving(false) }
  }

  async function resetAllData() {
    if (!confirm('⚠️ This will reset ALL platform data except customer accounts. This cannot be undone. Continue?')) return
    setResetting(true)
    try {
      const res = await fetch('/api/admin/reset-data', { method: 'POST' })
      if (res.ok) {
        alert('✅ Platform data reset successfully!')
        window.location.reload()
      } else {
        const d = await res.json()
        alert(`❌ Reset failed: ${d.error || 'Unknown error'}`)
      }
    } catch (error) {
      alert('❌ Network error during reset')
    } finally {
      setResetting(false)
    }
  }

  if (loading) {
    return <div className={styles.loading}><div className="spinner" /></div>
  }

  // Show user settings for non-admin users
  if (user?.role !== 'ADMIN') {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.subtitle}>Manage your account settings and preferences</p>
        </div>

        <div className={styles.grid}>
          {/* Username Settings */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Username</h2>
              <p className={styles.cardDescription}>Choose a unique username that will be displayed on your profile</p>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className={styles.input}
                  maxLength={20}
                />
                <div className={styles.inputHint}>Maximum 20 characters</div>
              </div>
              {saveMessage && (
                <div className={`${styles.message} ${saveMessage.includes('success') ? styles.success : styles.error}`}>
                  {saveMessage}
                </div>
              )}
              <button
                onClick={updateUsername}
                disabled={saving || username === user?.username}
                className={styles.button}
              >
                {saving ? 'Saving...' : 'Update Username'}
              </button>
            </div>
          </div>

          {/* Account Settings */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Account Information</h2>
              <p className={styles.cardDescription}>View your account details</p>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <div className={styles.infoLabel}>Email</div>
                  <div className={styles.infoValue}>{user?.email}</div>
                </div>
                <div className={styles.infoItem}>
                  <div className={styles.infoLabel}>Name</div>
                  <div className={styles.infoValue}>{user?.name}</div>
                </div>
                <div className={styles.infoItem}>
                  <div className={styles.infoLabel}>Phone</div>
                  <div className={styles.infoValue}>{user?.phone || 'Not provided'}</div>
                </div>
                <div className={styles.infoItem}>
                  <div className={styles.infoLabel}>Role</div>
                  <div className={styles.infoValue}>{user?.role}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className={styles.dangerCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.dangerTitle}>Danger Zone</h2>
              <p className={styles.dangerDescription}>Irreversible actions for your account</p>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.dangerContent}>
                <div className={styles.dangerInfo}>
                  <h3 className={styles.dangerActionTitle}>Delete Account</h3>
                  <p className={styles.dangerActionDescription}>
                    Permanently delete your account and all associated data including transaction history, linked cylinders, and personal information. This action cannot be undone.
                  </p>
                </div>
                <button
                  onClick={deleteAccount}
                  disabled={deleteLoading}
                  className={styles.dangerButton}
                >
                  {deleteLoading ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show admin settings for admin users
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Manage platform settings and administration</p>
      </div>

      <div className={styles.grid}>
        {/* Price Settings */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Gas Price</h2>
            <p className={styles.cardDescription}>Set the current price per kilogram of LPG gas</p>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Current Price</label>
              <div className={styles.priceInput}>
                <span className={styles.currency}>₦</span>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => { setPrice(e.target.value); setPriceErr('') }}
                  placeholder="Enter price"
                  className={styles.input}
                  min="100"
                  max="50000"
                />
                <span className={styles.perKg}>/kg</span>
              </div>
              {priceErr && <div className={styles.error}>{priceErr}</div>}
            </div>
            <button
              onClick={savePrice}
              disabled={saving || price === String(current)}
              className={styles.button}
            >
              {saving ? 'Saving...' : 'Update Price'}
            </button>
            {saved && <div className={styles.success}>Price updated successfully!</div>}
            {saveErr && <div className={styles.error}>{saveErr}</div>}
          </div>
        </div>

        {/* Admin Management */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Admin Users</h2>
            <p className={styles.cardDescription}>Manage platform administrators</p>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.adminList}>
              {adminUsers.map((admin: any) => (
                <div key={admin.id} className={styles.adminItem}>
                  <div className={styles.adminInfo}>
                    <div className={styles.adminEmail}>{admin.email}</div>
                    <div className={styles.adminRole}>{admin.role}</div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className={styles.button}
            >
              Add Admin User
            </button>
          </div>
        </div>

        {/* System Reset */}
        <div className={styles.dangerCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.dangerTitle}>System Reset</h2>
            <p className={styles.dangerDescription}>Critical system operations</p>
          </div>
          <div className={styles.cardContent}>
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
