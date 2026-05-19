import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)

async function fetchRole(userId) {
  const cached = localStorage.getItem('userRole')
  if (cached) return cached

  try {
    const { data } = await supabase
      .from('staff_profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    const role = data?.role ?? 'parent'
    localStorage.setItem('userRole', role)
    return role
  } catch {
    return localStorage.getItem('userRole') ?? 'parent'
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(() => localStorage.getItem('userRole') ?? null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        if (session?.user) {
          setUser(session.user)
          const r = await fetchRole(session.user.id)
          if (mounted) setRole(r)
        } else {
          setUser(null)
          setRole(null)
          localStorage.removeItem('userRole')
        }

        if (mounted) setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
