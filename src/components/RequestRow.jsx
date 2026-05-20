import { getCountdownSeconds, formatCountdown } from '../utils/countdown'

export default function RequestRow({ request, tick }) {
  // tick prop triggers re-render every second so countdown stays live
  void tick

  const child = request.children
  const classColor = child?.classes?.color || '#6B7280'
  const className = child?.classes?.name || '—'
  const childName = child?.full_name || '—'

  const remaining = getCountdownSeconds(request.requested_at)
  const countdownText = formatCountdown(remaining)

  const isArrived = request.status === 'arrived'
  const isReady = request.status === 'ready'

  return (
    <div
      className={`flex items-center px-6 rounded-lg mb-1.5 transition-all ${
        isArrived ? 'arrived-pulse' : ''
      }`}
      style={{
        height: '60px',
        backgroundColor: `${classColor}12`,
        borderLeft: `5px solid ${classColor}`,
        boxShadow: isArrived ? `0 0 18px ${classColor}66` : 'none',
      }}
    >
      {/* Class color dot */}
      <div
        className="w-4 h-4 rounded-full flex-shrink-0 mr-4"
        style={{ backgroundColor: classColor }}
      />

      {/* Child name */}
      <div className="flex-1 text-3xl font-black text-white truncate mr-6">
        {childName}
      </div>

      {/* Class label */}
      <div
        className="text-lg font-semibold mr-8 w-28 text-center shrink-0"
        style={{ color: classColor }}
      >
        {className}
      </div>

      {/* Status / countdown */}
      <div className="w-44 text-right shrink-0 font-mono">
        {isArrived ? (
          <span className="text-white font-black text-2xl tracking-wide">
            ⚡ ARRIVED
          </span>
        ) : isReady ? (
          <span className="text-green-400 font-black text-2xl">Ready</span>
        ) : countdownText ? (
          <span className="text-gray-200 text-2xl font-bold tabular-nums">
            {countdownText}
          </span>
        ) : (
          <span className="text-amber-500 font-bold text-lg">Arriving Soon</span>
        )}
      </div>
    </div>
  )
}
