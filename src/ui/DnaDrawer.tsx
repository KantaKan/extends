import { useState, type ReactNode } from 'react'
import { t } from './i18n'

type Props = { open: boolean; onToggle: () => void; pointAtHandle: boolean; children: ReactNode; notebook: ReactNode }

/** The DNA machine: the code editor (and the professor's notebook) in a drawer over the lab. */
export function DnaDrawer({ open, onToggle, pointAtHandle, children, notebook }: Props) {
  const [nbOpen, setNbOpen] = useState(true)
  return (
    <section className={`dna${open ? ' open' : ''}`} aria-label={t('dna.title')}>
      <button type="button" className={`dna-handle${pointAtHandle ? ' beckon' : ''}`} onClick={onToggle} aria-expanded={open}>
        <span className="helix" aria-hidden="true" />
        {open ? t('dna.title') : t('dna.open')}
        {open && <kbd>{t('dna.keys')}</kbd>}
        {pointAtHandle && <span className="pointer-inline" aria-hidden="true">▼</span>}
      </button>
      <div className="dna-body">
        <div className="dna-editor">{children}</div>
        {nbOpen && notebook}
        <button type="button" className="nb-toggle" onClick={() => setNbOpen((o) => !o)} aria-expanded={nbOpen}>
          {nbOpen ? '›' : `‹ ${t('nb.toggle')}`}
        </button>
      </div>
    </section>
  )
}
