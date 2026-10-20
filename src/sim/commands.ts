// Commands arrive from the player-code sandbox, so they are untrusted: parse, never cast.

export type Command =
  | { type: 'move'; id: number; x: number; y: number }
  | { type: 'gather'; id: number; target: number }
  | { type: 'eat'; id: number }
  | { type: 'rename'; id: number; name: string }

export const NAME_MAX = 16

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

export function parseCommand(raw: unknown): Command | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (!num(r.id)) return null
  switch (r.type) {
    case 'move': return num(r.x) && num(r.y) ? { type: 'move', id: r.id, x: r.x, y: r.y } : null
    case 'gather': return num(r.target) ? { type: 'gather', id: r.id, target: r.target } : null
    case 'eat': return { type: 'eat', id: r.id }
    case 'rename': {
      const name = typeof r.name === 'string' ? r.name.trim().slice(0, NAME_MAX) : ''
      return name ? { type: 'rename', id: r.id, name } : null
    }
    default: return null
  }
}
