import { useEffect, useRef, type RefObject } from 'react'
import type { Species } from '../render/morph/looks'
import type { Status } from '../render/creatureView'
import { Lab } from '../render/lab'
import type { Machine } from '../sim/upgrades'
import type { World } from '../sim/world'

type Props = {
  world: World
  species: Map<string, Species>
  status: Map<number, Status>
  lit: boolean
  onPick: (id: number | null) => void
  onTerminal: () => void
  onMachine: (m: Machine) => void
  /** The wall terminal blinks (outside the tutorial: "edit code here"). */
  beckon: boolean
  /** CSS px covered from below (open DNA machine) and the creature to keep in view. */
  cover: { bottom: number; focusId: number | null }
  /** Filled once Pixi is ready; cards and tutorial arrows read creature positions from it. */
  labRef: RefObject<Lab | null>
}

export function LabView({ world, species, status, lit, onPick, onTerminal, onMachine, beckon, cover, labRef }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const latest = useRef({ species, status, lit, onPick, onTerminal, onMachine, beckon, cover })
  latest.current = { species, status, lit, onPick, onTerminal, onMachine, beckon, cover }

  useEffect(() => {
    const l = new Lab()
    l.onPick = (id) => latest.current.onPick(id)
    l.onTerminal = () => latest.current.onTerminal()
    l.onMachine = (m) => latest.current.onMachine(m)
    const ready = l.mount(host.current!, world).then(() => {
      labRef.current = l
      l.setSpecies(latest.current.species)
      l.setStatus(latest.current.status)
      l.setLit(latest.current.lit, world)
      l.setCover(latest.current.cover.bottom, latest.current.cover.focusId)
      l.setBeckon(latest.current.beckon)
    })
    // Pixi init is async; destroy only after it finished (StrictMode mounts twice in dev).
    return () => void ready.then(() => { if (labRef.current === l) labRef.current = null; l.destroy() })
  }, [world, labRef])

  useEffect(() => { labRef.current?.setSpecies(species) }, [species, labRef])
  useEffect(() => { labRef.current?.setStatus(status) }, [status, labRef])
  useEffect(() => { labRef.current?.setLit(lit, world) }, [lit, world, labRef])
  useEffect(() => { labRef.current?.setBeckon(beckon) }, [beckon, labRef])
  useEffect(() => { labRef.current?.setCover(cover.bottom, cover.focusId) }, [cover.bottom, cover.focusId, labRef])

  return <div className="lab" ref={host} />
}
