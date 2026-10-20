import type { Progress, Quest } from '../sim/quests'
import { t, type Key } from './i18n'

export const questText = (q: Quest, part: 'title' | 'hint' | 'nudge', vars: Record<string, string> = {}) => t(`quest.${q.textKey}.${part}` as Key, vars)

type Props = { quest: Quest | null; progress: Progress | null; vars: Record<string, string>; onOpenDna: () => void }

export function QuestCard({ quest, progress, vars, onOpenDna }: Props) {
  if (!quest || !progress) return <aside className="quest">{t('quest.allDone')}</aside>
  return (
    <aside className="quest">
      <div className="quest-head">
        <span>{t('quest.label')}</span>
        <b>{progress.have}/{progress.need}</b>
      </div>
      <p className="quest-title">{questText(quest, 'title')}</p>
      <div className="quest-bar" role="progressbar" aria-valuemin={0} aria-valuemax={progress.need} aria-valuenow={progress.have}>
        <em style={{ transform: `scaleX(${progress.need ? progress.have / progress.need : 0})` }} />
      </div>
      <p className="quest-hint"><code>{questText(quest, 'hint', vars)}</code></p>
      {progress.missing && <p className="quest-missing">{t(`quest.needs.${progress.missing}`)}</p>}
      <button type="button" className="quest-go" onClick={onOpenDna}>{t('quest.openDna')}</button>
    </aside>
  )
}
