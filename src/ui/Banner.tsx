export type BannerMsg = { id: number; kind: 'done' | 'new'; label: string; title: string }

const SPARKS = [[-120, -50], [130, -40], [-90, 50], [110, 60], [0, -70], [-150, 10], [160, 5]] as const

/** Big centre message for quest done / new quest. Re-keyed per message so the animation replays. */
export function Banner({ msg }: { msg: BannerMsg | null }) {
  if (!msg) return null
  return (
    <div key={msg.id} className={`banner ${msg.kind}`} role="status">
      <small>{msg.label}</small>
      <b>{msg.title}</b>
      {msg.kind === 'done' && SPARKS.map(([dx, dy], i) => (
        <span key={i} className="spark" aria-hidden="true" style={{ left: '50%', top: '50%', ['--dx' as string]: `${dx}px`, ['--dy' as string]: `${dy}px` }}>✦</span>
      ))}
    </div>
  )
}
