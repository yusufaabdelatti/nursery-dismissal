import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const ROLE_REDIRECTS = {
  admin: '/admin',
  staff: '/staff',
  display: '/display',
  parent: '/parent',
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleLogin = async () => {
    if (!email || !password) return
    setLoading(true)
    setError(null)

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }
    const { data: staffData } = await supabase
      .from('staff_profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    const role = staffData?.role ?? 'parent'
    navigate(ROLE_REDIRECTS[role] ?? '/parent', { replace: true })
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#F0F4F8' }}>
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '12px 20px', display: 'inline-block', marginBottom: '12px' }}>
            <img src="/kiddytech-logo.png" alt="KiddyTech" style={{ width: '160px', height: 'auto', display: 'block' }} onError={(e) => { e.target.style.display = 'none' }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E2D3D' }}>KiddyTech</h1>
          <p className="text-xs mt-1" style={{ color: '#4A5568' }}>Smart Dismissal System</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" style={{ color: '#1E2D3D' }}>
            Email
          </label>
          <input
            type="email"
            autoComplete="email"
            className="w-full rounded-lg px-3 py-3 text-sm focus:outline-none"
            style={{
              border: '1px solid #CBD5E0',
              boxShadow: 'none',
            }}
            onFocus={(e) => { e.target.style.outline = 'none'; e.target.style.boxShadow = '0 0 0 2px #4AADA0' }}
            onBlur={(e) => { e.target.style.boxShadow = 'none' }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-1" style={{ color: '#1E2D3D' }}>
            Password
          </label>
          <input
            type="password"
            autoComplete="current-password"
            className="w-full rounded-lg px-3 py-3 text-sm focus:outline-none"
            style={{
              border: '1px solid #CBD5E0',
              boxShadow: 'none',
            }}
            onFocus={(e) => { e.target.style.outline = 'none'; e.target.style.boxShadow = '0 0 0 2px #4AADA0' }}
            onBlur={(e) => { e.target.style.boxShadow = 'none' }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading || !email || !password}
          className="w-full text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{ backgroundColor: '#4AADA0' }}
          onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#3D9990' }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#4AADA0' }}
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        <p className="text-center text-xs mt-6" style={{ color: '#4A5568' }}>
          Powered by KiddyTech • Smart Nursery Solutions
        </p>
      </div>
    </div>
  )
}
