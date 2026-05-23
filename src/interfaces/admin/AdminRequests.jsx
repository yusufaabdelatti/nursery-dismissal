import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import { usePickupRequests } from '../../hooks/usePickupRequests'

const STATUS_STYLES = {
  requested: { backgroundColor: '#E8F5F4', color: '#4AADA0', label: 'Requested' },
  arrived:   { backgroundColor: '#FEF3C7', color: '#D97706', label: 'Arrived'   },
  ready:     { backgroundColor: '#E8F5F4', color: '#4AADA0', label: 'Ready'     },
}

function formatTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function AdminRequests() {
  const { requests, loading, refetch } = usePickupRequests()
  const [showConfirm, setShowConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)

  const clearRequest = async (id) => {
    await supabase
      .from('pickup_requests')
      .update({ status: 'cleared' })
      .eq('id', id)
  }

  const clearAll = async () => {
    setShowConfirm(false)
    setClearing(true)
    const ids = requests.map((r) => r.id)
    await supabase
      .from('pickup_requests')
      .update({ status: 'cleared' })
      .in('id', ids)
    setClearing(false)
    refetch()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#1E2D3D' }}>Active Requests</h1>
        {requests.length > 0 && (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={clearing}
            className="text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            style={{ backgroundColor: '#1E2D3D' }}
          >
            Clear All Active
          </button>
        )}
      </div>

      {loading && (
        <div className="py-12 text-center" style={{ color: '#4A5568' }}>Loading…</div>
      )}

      {!loading && requests.length === 0 && (
        <div className="py-12 text-center" style={{ color: '#4A5568' }}>No active pickup requests today</div>
      )}

      {!loading && requests.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b" style={{ backgroundColor: '#F0F4F8' }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: '#4A5568' }}>Child</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: '#4A5568' }}>Class</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: '#4A5568' }}>Status</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: '#4A5568' }}>Requested</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => {
                const child = req.children
                const cls = child?.classes
                const style = STATUS_STYLES[req.status] || STATUS_STYLES.requested
                const color = cls?.color || '#6B7280'

                return (
                  <tr key={req.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium" style={{ color: '#1E2D3D' }}>
                      {child?.full_name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${color}20`, color }}
                      >
                        {cls?.name || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: style.backgroundColor, color: style.color }}>
                        {style.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums" style={{ color: '#4A5568' }}>
                      {formatTime(req.requested_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => clearRequest(req.id)}
                        className="text-red-500 hover:underline text-xs"
                      >
                        Clear
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold mb-3" style={{ color: '#1E2D3D' }}>Clear All Active Requests?</h2>
            <p className="text-sm mb-5" style={{ color: '#4A5568' }}>
              This will mark all {requests.length} active request{requests.length !== 1 ? 's' : ''} as cleared. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={clearAll}
                className="px-4 py-2 text-sm text-white rounded-lg"
                style={{ backgroundColor: '#1E2D3D' }}
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
