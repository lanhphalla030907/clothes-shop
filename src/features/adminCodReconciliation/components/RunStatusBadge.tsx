import type { ReconciliationRunStatus } from '@/types/api'

const tone: Record<ReconciliationRunStatus, string> = {
  running: 'border-info/25 bg-info-soft text-info',
  completed: 'border-success/25 bg-success-soft text-success',
  failed: 'border-signal/25 bg-signal-soft text-signal',
}

export function RunStatusBadge({ status }: { status: ReconciliationRunStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-medium capitalize ${tone[status]}`}
    >
      <span
        aria-hidden
        className={`size-1.5 rounded-full ${
          status === 'completed'
            ? 'bg-success'
            : status === 'failed'
              ? 'bg-signal'
              : 'animate-pulse bg-info'
        }`}
      />
      {status}
    </span>
  )
}
