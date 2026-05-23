import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../hooks/useAuth'
import { usePickupRequests } from '../../hooks/usePickupRequests'
import { usePushNotifications } from '../../hooks/usePushNotifications'
import { sortRequests } from '../../utils/sorting'
import { getCountdownSeconds, formatCountdown } from '../../utils/countdown'

function CountdownBadge({ requestedAt, status }) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [])

  void tick

  if (status === 'arrived') {
    return (
      <span className="inline-flex items-center gap-1 font-bold text-sm px-3 py-1 rounded-full" style={{ backgroundColor: '#E8F5F4', color: '#4AADA0' }}>
        ⚡ ARRIVED
      </span>
    )
  }

  if (status === 'ready') {
    return (
      <span className="inline-flex items-center font-semibold text-sm px-3 py-1 rounded-full" style={{ backgroundColor: '#E8F5F4', color: '#4AADA0' }}>
        Ready
      </span>
    )
  }

  const remaining = getCountdownSeconds(requestedAt)
  const text = formatCountdown(remaining)

  if (!text) {
    return <span className="text-sm font-medium" style={{ color: '#4AADA0' }}>Arriving Soon</span>
  }

  return (
    <span className="text-gray-500 text-sm font-mono tabular-nums">{text}</span>
  )
}

function RequestCard({ request, onMarkReady, onMarkDelivered }) {
  const child = request.children
  const classColor = child?.classes?.color || '#6B7280'
  const isArrived = request.status === 'arrived'
  const isReady = request.status === 'ready'

  return (
    <div
      className="rounded-xl p-4 mb-3"
      style={{
        border: isArrived ? `1px solid #4AADA0` : '1px solid #E2E8F0',
        backgroundColor: isArrived ? '#E8F5F4' : 'white',
        boxShadow: isArrived ? `0 0 12px rgba(74,173,160,0.3)` : '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: classColor }}
        />
        <span className="font-semibold text-lg flex-1 truncate" style={{ color: '#1E2D3D' }}>
          {child?.full_name || '—'}
        </span>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${classColor}20`, color: classColor }}
        >
          {child?.classes?.name || '—'}
        </span>
        <CountdownBadge requestedAt={request.requested_at} status={request.status} />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onMarkReady(request.id)}
          disabled={isReady || isArrived}
          className="flex-1 py-3 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed"
          style={
            isReady || isArrived
              ? { backgroundColor: '#E8F5F4', color: '#4AADA0', border: '1px solid #4AADA0' }
              : { backgroundColor: '#E8F5F4', color: '#4AADA0', border: '1px solid #4AADA0' }
          }
        >
          {isReady ? '✓ Ready' : 'Mark Ready'}
        </button>
        <button
          onClick={() => onMarkDelivered(request.id)}
          className="flex-1 py-3 rounded-lg text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: '#1E2D3D' }}
        >
          Mark Delivered
        </button>
      </div>
    </div>
  )
}

export default function StaffApp() {
  const { user } = useAuth()
  const [staffName, setStaffName] = useState('')
  const [assignedClassId, setAssignedClassId] = useState(null)
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [error, setError] = useState(null)

  const { requests, loading, removeRequest } = usePickupRequests()
  const { status, errorMsg, isSupported, subscribe } = usePushNotifications(user?.id)

  const filtered = selectedClass
    ? requests.filter((r) => r.children?.class_id === selectedClass)
    : requests

  useEffect(() => {
    if (!user) return

    supabase
      .from('staff_profiles')
      .select('display_name, class_id')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setStaffName(data.display_name)
          if (data.class_id) {
            setAssignedClassId(data.class_id)
            setSelectedClass(data.class_id)
          }
        }
      })

    supabase
      .from('classes')
      .select('id, name')
      .order('name')
      .then(({ data }) => setClasses(data || []))
  }, [user])

  const markReady = async (requestId) => {
    setError(null)
    const { error: err } = await supabase
      .from('pickup_requests')
      .update({ status: 'ready', ready_at: new Date().toISOString() })
      .eq('id', requestId)

    if (err) setError('Something went wrong. Please try again.')
  }

  const markDelivered = async (requestId) => {
    setError(null)
    removeRequest(requestId)

    const { error: err } = await supabase
      .from('pickup_requests')
      .update({ status: 'delivered', delivered_at: new Date().toISOString() })
      .eq('id', requestId)

    if (err) setError('Something went wrong. Please try again.')
  }

  const logout = async () => {
    await supabase.auth.signOut()
  }

  const sorted = sortRequests(filtered)

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F0F4F8' }}>
      {/* Top bar */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: '#1E2D3D' }}>
        <div className="flex-1">
          <span className="font-semibold text-white">{staffName || 'Staff'}</span>
        </div>

        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm focus:outline-none"
          style={{ border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
        >
          <option value="" style={{ backgroundColor: '#1E2D3D' }}>All Classes</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id} style={{ backgroundColor: '#1E2D3D' }}>
              {cls.name}
            </option>
          ))}
        </select>

        <button
          onClick={logout}
          className="text-sm px-3 py-2 rounded-lg transition-colors"
          style={{ color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.2)' }}
        >
          Sign out
        </button>
      </div>

      {/* Notification banners */}
      {isSupported && status !== 'subscribed' && status !== 'denied' && (
        <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: '#E8F5F4', borderBottom: '1px solid #4AADA0' }}>
          <span className="text-sm" style={{ color: '#1E2D3D' }}>
            Enable notifications to get alerted for new pickup requests
          </span>
          <button
            onClick={subscribe}
            disabled={status === 'requesting'}
            className="ml-4 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 whitespace-nowrap"
            style={{ backgroundColor: '#4AADA0' }}
          >
            {status === 'requesting' ? 'Enabling…' : 'Enable'}
          </button>
        </div>
      )}
      {status === 'denied' && (
        <div className="px-4 py-3 text-sm text-red-700" style={{ backgroundColor: '#FEF2F2', borderBottom: '1px solid #FCA5A5' }}>
          Notifications blocked. Please enable them in your browser settings.
        </div>
      )}
      {errorMsg && (
        <div className="px-4 py-3 text-sm text-red-700" style={{ backgroundColor: '#FEF2F2', borderBottom: '1px solid #FCA5A5' }}>
          {errorMsg}
        </div>
      )}

      <div className="flex-1 p-4 max-w-2xl mx-auto w-full">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-3 text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-16" style={{ color: '#4A5568' }}>Loading…</div>
        )}

        {!loading && sorted.length === 0 && (
          <div className="text-center py-16" style={{ color: '#4A5568' }}>
            No active pickup requests
          </div>
        )}

        {!loading &&
          sorted.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              onMarkReady={markReady}
              onMarkDelivered={markDelivered}
            />
          ))}
      </div>
    </div>
  )
}
