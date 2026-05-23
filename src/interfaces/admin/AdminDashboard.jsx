import { useState } from 'react'
import { NavLink, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../hooks/useAuth'
import AdminChildren from './AdminChildren'
import AdminClasses from './AdminClasses'
import AdminParents from './AdminParents'
import AdminStaff from './AdminStaff'
import AdminSettings from './AdminSettings'
import AdminRequests from './AdminRequests'

const NAV_ITEMS = [
  { path: 'requests', label: 'Active Requests' },
  { path: 'children', label: 'Children' },
  { path: 'classes', label: 'Classes' },
  { path: 'parents', label: 'Parent Accounts' },
  { path: 'staff', label: 'Staff Accounts' },
  { path: 'settings', label: 'Settings' },
]

function Hamburger() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="w-5 h-0.5 bg-white opacity-80" />
      <div className="w-5 h-0.5 bg-white opacity-80" />
      <div className="w-5 h-0.5 bg-white opacity-80" />
    </div>
  )
}

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  const logout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F0F4F8' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static z-30 h-full w-64 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ backgroundColor: '#1E2D3D' }}
      >
        {/* Logo area */}
        <div className="p-5 border-b border-white border-opacity-10 flex flex-col items-center text-center">
          <div style={{ background: '#FFFFFF', borderRadius: '10px', padding: '8px 12px', marginBottom: '10px', display: 'inline-flex' }}>
            <img src="/kiddytech-logo.png" alt="KiddyTech" style={{ width: '80px', height: 'auto', display: 'block' }} onError={(e) => { e.target.style.display = 'none' }} />
          </div>
          <p className="text-white font-bold text-sm">KiddyTech Admin</p>
          <p className="text-xs mt-0.5 truncate w-full" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {user?.email}
          </p>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={`/admin/${item.path}`}
              className={({ isActive }) =>
                `block px-4 py-3 rounded-lg mb-1 text-sm font-medium transition-colors ${
                  isActive ? '' : 'hover:bg-white hover:bg-opacity-10'
                }`
              }
              style={({ isActive }) => isActive
                ? { color: '#4AADA0', borderLeft: '3px solid #4AADA0', paddingLeft: '13px', backgroundColor: 'rgba(74,173,160,0.12)' }
                : { color: 'rgba(255,255,255,0.8)' }
              }
              onClick={() => setSidebarOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white border-opacity-10">
          <button
            onClick={logout}
            className="w-full px-4 py-2 rounded-lg text-sm text-left transition-colors hover:bg-white hover:bg-opacity-10"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        {/* Mobile top bar */}
        <header className="lg:hidden border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10" style={{ backgroundColor: '#1E2D3D' }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-white hover:bg-opacity-10"
            aria-label="Open menu"
          >
            <Hamburger />
          </button>
          <div style={{ background: '#FFFFFF', borderRadius: '6px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center' }}>
            <img src="/kiddytech-logo.png" alt="KiddyTech" style={{ height: '20px', width: 'auto' }} onError={(e) => { e.target.style.display = 'none' }} />
          </div>
          <span className="font-semibold text-white text-sm">
            KiddyTech Admin
          </span>
        </header>

        <main className="flex-1 p-6">
          <Routes>
            <Route index element={<Navigate to="requests" replace />} />
            <Route path="requests" element={<AdminRequests />} />
            <Route path="children" element={<AdminChildren />} />
            <Route path="classes" element={<AdminClasses />} />
            <Route path="parents" element={<AdminParents />} />
            <Route path="staff" element={<AdminStaff />} />
            <Route path="settings" element={<AdminSettings />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
