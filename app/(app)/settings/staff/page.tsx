'use client'
import { useEffect, useState } from 'react'
import { getSession } from 'next-auth/react'
import styles from './staff.module.css'

type Staff = {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'OUTLET_STAFF'
  outletId: number | null
  outlet?: { id: number; name: string; location: string }
  createdAt: string
}

export default function StaffPage() {
  const [session, setSession] = useState<any>(null)
  const [staff, setStaff] = useState<Staff[]>([])
  const [outlets, setOutlets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'OUTLET_STAFF' as 'ADMIN' | 'OUTLET_STAFF',
    outletId: ''
  })

  useEffect(() => {
    const loadData = async () => {
      const sessionData = await getSession()
      setSession(sessionData)

      if ((sessionData?.user as any)?.role === 'ADMIN') {
        const [staffRes, outletsRes] = await Promise.all([
          fetch('/api/admin/staff'),
          fetch('/api/outlets')
        ])

        if (staffRes.ok && outletsRes.ok) {
          const [staffData, outletsData] = await Promise.all([
            staffRes.json(),
            outletsRes.json()
          ])
          setStaff(staffData)
          setOutlets(outletsData)
        }
      }
      setLoading(false)
    }

    loadData()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    const url = editingStaff ? '/api/admin/staff' : '/api/admin/staff'
    const method = editingStaff ? 'PUT' : 'POST'
    
    const payload = editingStaff 
      ? { ...formData, id: editingStaff.id }
      : formData

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save staff member')
      }

      // Reload staff list
      const staffRes = await fetch('/api/admin/staff')
      if (staffRes.ok) {
        const staffData = await staffRes.json()
        setStaff(staffData)
      }
      
      // Reset form
      setShowAddForm(false)
      setEditingStaff(null)
      setFormData({
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

  async function handleDelete(staffId: string) {
    if (!confirm('Are you sure you want to remove this staff member?')) return

    try {
      const res = await fetch(`/api/admin/staff?id=${staffId}`, {
        method: 'DELETE'
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete staff member')
      }

      setStaff(staff.filter(s => s.id !== staffId))
      alert('Staff member removed successfully!')
    } catch (error) {
      console.error('Error deleting staff member:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete staff member')
    }
  }

  function editStaffMember(staffMember: Staff) {
    setEditingStaff(staffMember)
    setFormData({
      email: staffMember.email,
      name: staffMember.name,
      role: staffMember.role,
      outletId: staffMember.outletId?.toString() || ''
    })
    setShowAddForm(true)
  }

  if (loading) return <div className={styles.loading}>Loading...</div>
  if (!session || session.user?.role !== 'ADMIN') {
    return <div className={styles.unauthorized}>Access Denied</div>
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>Staff Management</h1>
        <button 
          onClick={() => setShowAddForm(true)}
          className={styles.addBtn}
        >
          + Add Staff Member
        </button>
      </div>

      {showAddForm && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>
              {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
            </h2>
            
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label>Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="staff@gmail.com"
                  required
                />
              </div>

              <div className={styles.field}>
                <label>Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className={styles.field}>
                <label>Role</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value as 'ADMIN' | 'OUTLET_STAFF'})}
                  className={styles.select}
                >
                  <option value="OUTLET_STAFF">Outlet Staff</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              {formData.role === 'OUTLET_STAFF' && (
                <div className={styles.field}>
                  <label>Assigned Outlet</label>
                  <select
                    value={formData.outletId}
                    onChange={e => setFormData({...formData, outletId: e.target.value})}
                    className={styles.select}
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

              <div className={styles.formActions}>
                <button type="submit" className={styles.saveBtn}>
                  {editingStaff ? 'Update' : 'Add'} Staff Member
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingStaff(null)
                    setFormData({
                      email: '',
                      name: '',
                      role: 'OUTLET_STAFF',
                      outletId: ''
                    })
                  }}
                  className={styles.cancelBtn}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className={styles.staffGrid}>
        {staff.map(staffMember => (
          <div key={staffMember.id} className={`${styles.staffCard} ${editingStaff?.id === staffMember.id ? styles.editing : ''}`}>
            <div className={styles.staffHeader}>
              <div className={styles.staffInfo}>
                <div className={styles.staffName}>{staffMember.name}</div>
                <div className={styles.staffEmail}>{staffMember.email}</div>
                <div className={styles.staffRole}>{staffMember.role.replace('_', ' ')}</div>
              </div>
              <div className={styles.staffActions}>
                <button 
                  onClick={() => editStaffMember(staffMember)}
                  className={styles.editBtn}
                  disabled={editingStaff?.id === staffMember.id}
                >
                  {editingStaff?.id === staffMember.id ? 'Editing...' : 'Edit'}
                </button>
                <button 
                  onClick={() => handleDelete(staffMember.id)}
                  className={styles.deleteBtn}
                  disabled={editingStaff?.id === staffMember.id}
                >
                  Delete
                </button>
              </div>
            </div>
            
            {staffMember.outlet && (
              <div className={styles.outletInfo}>
                <span className={styles.outletLabel}>Outlet:</span>
                <span className={styles.outletName}>
                  {staffMember.outlet.name} - {staffMember.outlet.location}
                </span>
              </div>
            )}
            
            <div className={styles.staffMeta}>
              Added: {new Date(staffMember.createdAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
