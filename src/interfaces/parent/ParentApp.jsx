import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../hooks/useAuth'
import { usePushNotifications } from '../../hooks/usePushNotifications'

export default function ParentApp() {
  const { user } = useAuth()
  const [child, setChild] = useState(null)
  const [request, setRequest] = useState(null)
  const [loadingData, setLoadingData] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showGoodbye, setShowGoodbye] = useState(false)
  const channelRef = useRef(null)
  const { status, errorMsg, isSupported, subscribe } = usePushNotifications(user?.id)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (!user) return
    loadChild()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [user])

  const loadChild = async () => {
    setLoadingData(true)
    setError(null)

    const { data: childData, error: childError } = await supabase
      .from('children')
      .select('*, classes(name, color)')
      .eq('parent_user_id', user.id)
      .eq('is_active', true)
      .single()

    if (childError || !childData) {
      setError('No child account linked. Please contact the nursery.')
      setLoadingData(false)
      return
    }

    setChild(childData)
    await loadTodayRequest(childData.id)
    subscribeToChild(childData.id)
    setLoadingData(false)
  }

  const loadTodayRequest = async (childId) => {
    const { data } = await supabase
      .from('pickup_requests')
      .select('*')
      .eq('child_id', childId)
      .eq('date', today)
      .not('status', 'in', '(delivered,cleared)')
      .maybeSingle()

    setRequest(data ?? null)
  }

  const subscribeToChild = (childId) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current)

    const channel = supabase
      .channel(`parent_${childId}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pickup_requests',
          filter: `child_id=eq.${childId}`,
        },
        (payload) => {
          const updated = payload.new
          if (!updated) return

          if (updated.status === 'delivered' || updated.status === 'cleared') {
            setShowGoodbye(true)
            setTimeout(() => {
              setShowGoodbye(false)
              setRequest(null)
            }, 3000)
          } else {
            setRequest(updated)
          }
        }
      )
      .subscribe()

    channelRef.current = channel
  }

  const requestPickup = async () => {
    setActionLoading(true)
    setError(null)

    const { data, error: insertError } = await supabase
      .from('pickup_requests')
      .insert({ child_id: child.id, status: 'requested', date: today })
      .select()
      .single()

    if (insertError) {
      setError('Something went wrong. Please try again.')
      setActionLoading(false)
      return
    }

    setRequest(data)
    setActionLoading(false)
  }

  const markArrived = async () => {
    setActionLoading(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('pickup_requests')
      .update({ status: 'arrived', arrived_at: new Date().toISOString() })
      .eq('id', request.id)

    if (updateError) {
      setError('Something went wrong. Please try again.')
    }
    setActionLoading(false)
  }

  const logout = async () => {
    await supabase.auth.signOut()
  }

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F0F4F8' }}>
        <div className="text-lg" style={{ color: '#4A5568' }}>Loading…</div>
      </div>
    )
  }

  if (error && !child) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: '#F0F4F8' }}>
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm underline"
            style={{ color: '#4A5568' }}
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  const accentColor = child?.classes?.color || '#1E2D3D'
  const firstName = child?.full_name?.split(' ')[0] || child?.full_name || ''

  // State E — goodbye after delivered/cleared
  if (showGoodbye) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: '#E8F5F4' }}>
        <div className="text-center">
          <div className="text-5xl mb-4">👋</div>
          <h2 className="text-2xl font-bold" style={{ color: '#1E2D3D' }}>Goodbye!</h2>
          <p className="mt-2" style={{ color: '#4A5568' }}>See you tomorrow</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F0F4F8' }}>
      {/* Header */}
      <div
        className="px-6 pt-12 pb-8 text-white"
        style={{ backgroundColor: accentColor }}
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {child?.classes?.name || 'KiddyTech'}
            </p>
            <h1 className="text-3xl font-bold mt-1">{child?.full_name}</h1>
          </div>
          <button
            onClick={logout}
            className="text-xs rounded px-2 py-1 mt-1"
            style={{ color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.3)' }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-6">
        {error && (
          <div className="w-full max-w-sm bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        {/* State A — no active request */}
        {!request && (
          <div className="w-full max-w-sm text-center">
            {isSupported && status !== 'subscribed' && status !== 'denied' && (
              <div className="w-full max-w-sm px-4 py-3 rounded-xl mb-4 flex items-center justify-between"
                style={{ backgroundColor: '#E8F5F4', border: '1px solid #4AADA0' }}>
                <span className="text-sm" style={{ color: '#1E2D3D' }}>
                  Get notified when your child is ready
                </span>
                <button
                  onClick={subscribe}
                  disabled={status === 'requesting'}
                  className="ml-3 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 whitespace-nowrap"
                  style={{ backgroundColor: '#4AADA0' }}
                >
                  {status === 'requesting' ? '…' : 'Enable'}
                </button>
              </div>
            )}
            {errorMsg && (
              <p className="text-red-600 text-xs mb-4">{errorMsg}</p>
            )}
            <p className="mb-8 text-lg" style={{ color: '#4A5568' }}>Ready for pickup?</p>
            <button
              onClick={requestPickup}
              disabled={actionLoading}
              className="w-full text-white font-semibold text-xl py-5 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
              style={{ backgroundColor: '#4AADA0', minHeight: '72px' }}
            >
              {actionLoading ? 'Sending…' : 'Request Pickup'}
            </button>
          </div>
        )}

        {/* State B — requested, staff notified */}
        {request && request.status === 'requested' && (
          <div className="w-full max-w-sm text-center">
            <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: '#E8F5F4', border: '1px solid #4AADA0' }}>
              <p className="font-semibold text-lg" style={{ color: '#1E2D3D' }}>
                Pickup requested
              </p>
              <p className="text-sm mt-1" style={{ color: '#4A5568' }}>
                Staff have been notified
              </p>
            </div>
            <p className="mb-4 text-sm" style={{ color: '#4A5568' }}>
              Press the button below when you arrive at the nursery
            </p>
            <button
              onClick={markArrived}
              disabled={actionLoading}
              className="w-full text-white font-semibold text-xl py-5 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
              style={{ backgroundColor: '#1E2D3D', minHeight: '72px' }}
            >
              {actionLoading ? 'Updating…' : 'I Have Arrived'}
            </button>
          </div>
        )}

        {/* State C — ready, warm message */}
        {request && request.status === 'ready' && (
          <div className="w-full max-w-sm text-center">
            <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: '#E8F5F4', border: '1px solid #4AADA0' }}>
              <div className="text-4xl mb-3">🌟</div>
              <p className="font-bold text-xl mb-2" style={{ color: '#1E2D3D' }}>
                {firstName} is ready and waiting for you!
              </p>
              <p className="text-sm" style={{ color: '#4AADA0' }}>
                Come on over — we'll have them at the door with a smile 💛
              </p>
            </div>
            <p className="mb-4 text-sm" style={{ color: '#4A5568' }}>
              Press the button below when you arrive
            </p>
            <button
              onClick={markArrived}
              disabled={actionLoading}
              className="w-full text-white font-semibold text-xl py-5 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
              style={{ backgroundColor: '#1E2D3D', minHeight: '72px' }}
            >
              {actionLoading ? 'Updating…' : 'I Have Arrived'}
            </button>
          </div>
        )}

        {/* State D — arrived, awaiting handoff */}
        {request && request.status === 'arrived' && (
          <div className="w-full max-w-sm text-center">
            <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: '#E8F5F4' }}>
              <div className="flex justify-center mb-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(74,173,160,0.2)' }}
                >
                  <div
                    className="w-8 h-8 rounded-full animate-pulse"
                    style={{ backgroundColor: '#4AADA0' }}
                  />
                </div>
              </div>
              <p className="font-bold text-xl mb-2" style={{ color: '#1E2D3D' }}>You're here!</p>
              <p style={{ color: '#4A5568' }}>
                We're bringing {firstName} to you now 🤗
              </p>
            </div>

            <div className="rounded-xl px-5 py-3 text-sm font-medium" style={{ backgroundColor: '#E8F5F4', border: '1px solid #4AADA0', color: '#4AADA0' }}>
              Arrival confirmed — please wait
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
