import ORDERS from '../../content/orders.json'
import { orderProgress, ticksLeft, type OrdersState, type OrderTemplate } from '../sim/orders'
import type { World } from '../sim/world'
import { t, type Key } from './i18n'

const TEMPLATES = ORDERS as OrderTemplate[]
const byId = new Map(TEMPLATES.map((o) => [o.id, o]))

/** The orders board, as a card under the quest. Re-renders with the HUD (10×/s). */
type Props = { orders: OrdersState; world: World; elementOf: (cls: string) => string | undefined }

export function OrdersCard({ orders, world, elementOf }: Props) {
  return (
    <aside className="orders">
      <div className="quest-head"><span>{t('orders.title')}</span><b>◆ {world.resources.crystal}</b></div>
      {!orders.active.length && <p className="orders-wait">{t('orders.waiting')}</p>}
      {orders.active.map((o) => {
        const tpl = byId.get(o.id)
        if (!tpl) return null
        const p = orderProgress(tpl, o, world, elementOf)
        const left = Math.max(0, ticksLeft(tpl, o, world))
        const total = tpl.seconds * 10
        return (
          <div key={o.id + o.startTick} className="order">
            <div className="order-head">
              <span>{t(`order.${tpl.kind}` as Key, { count: tpl.count, element: tpl.element ? t(`element.${tpl.element}` as Key) : '' })}</span>
              <b>◆{tpl.reward}</b>
            </div>
            <div className="quest-bar"><em style={{ transform: `scaleX(${p.have / p.need})` }} /></div>
            <div className="order-time" aria-label={t('orders.timeLeft', { s: Math.ceil(left / 10) })}>
              <em style={{ transform: `scaleX(${left / total})` }} />
            </div>
          </div>
        )
      })}
    </aside>
  )
}
