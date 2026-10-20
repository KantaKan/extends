import { useEffect, useState } from 'react'
import { fromSave, type LabSave } from '../sim/save'
import { App } from './App'
import { t } from './i18n'
import { idbGet } from './idb'

/** Load the saved lab (IndexedDB is async) before the game starts. */
export function Boot() {
  const [saved, setSaved] = useState<LabSave | null | undefined>(undefined)
  useEffect(() => { void idbGet('lab').then((raw) => setSaved(fromSave(raw))) }, [])
  if (saved === undefined) return <div className="boot">{t('boot.loading')}</div>
  return <App saved={saved} />
}
