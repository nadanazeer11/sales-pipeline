import type { Funnel } from '@sp/core'
import { percent } from '@/lib/format'

const stages: { key: keyof Funnel; label: string }[] = [
  { key: 'leads', label: 'Leads' },
  { key: 'visited', label: 'Viewed' },
  { key: 'invited', label: 'Invited' },
  { key: 'accepted', label: 'Connected' },
  { key: 'messaged', label: 'Messaged' },
  { key: 'replied', label: 'Replied' },
]

export function FunnelStrip({ funnel }: { funnel: Funnel }) {
  return (
    <div className="grid grid-cols-6 border-b border-zinc-200">
      {stages.map(({ key, label }, i) => (
        <div key={key} className="border-r border-zinc-100 px-5 py-3.5 last:border-r-0">
          <div className="text-xs text-zinc-500">{label}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[20px] font-semibold tracking-tight tabular-nums">
              {funnel[key]}
            </span>
            {i > 0 && (
              <span className="text-xs text-zinc-400 tabular-nums">
                {percent(funnel[key], funnel.leads)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
