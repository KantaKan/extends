import { useEffect, useRef } from 'react'
import MonacoEditor, { type OnMount } from '@monaco-editor/react'
import { monaco } from './monaco'
import { showApiFor, transpile, type Transpiled } from './transpile'

const DRAFT_KEY = 'extends.draft'
const AUTOSAVE_MS = 2000

type Props = {
  /** Used when there is no saved draft yet. */
  starter: string
  onSave: (result: Transpiled) => void
  onChange?: (text: string) => void
  /** Esc inside the editor (when no popup is open): close the DNA machine. */
  onEscape?: () => void
  /** Focus the editor when this turns true (the drawer opened). */
  active: boolean
  /** Make the first line containing this text glow (tutorial). */
  highlight?: string | null
}

export function Editor({ starter, onSave, onChange, onEscape, active, highlight }: Props) {
  const cb = useRef({ onSave, onChange, onEscape })
  cb.current = { onSave, onChange, onEscape }
  const ed = useRef<Parameters<OnMount>[0]>(null)
  const decorations = useRef<monaco.editor.IEditorDecorationsCollection>(null)
  const timer = useRef<number>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  useEffect(() => {
    if (active) ed.current?.focus()
    // Closed drawer: let go of the keyboard, or keys (Tab!) would type into code nobody can see.
    else if (ed.current?.hasTextFocus() && document.activeElement instanceof HTMLElement) document.activeElement.blur()
  }, [active])

  useEffect(() => {
    const e = ed.current
    if (!e) return
    const model = e.getModel()
    const line = highlight && model ? model.getLinesContent().findIndex((l) => l.includes(highlight)) + 1 : 0
    decorations.current?.set(line ? [{ range: new monaco.Range(line, 1, line, 1), options: { isWholeLine: true, className: 'tut-line' } }] : [])
  }, [highlight])

  const mount: OnMount = (editor) => {
    ed.current = editor
    decorations.current = editor.createDecorationsCollection()
    const save = async () => {
      const model = editor.getModel()
      if (!model) return
      saveDraft(model.getValue())
      try {
        cb.current.onSave(await transpile(model))
      } catch (e) {
        console.error('[editor] TypeScript never became ready; Ctrl+S will retry', e) // never a silent dead lab
      }
    }
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, save)
    // Esc normally closes Monaco's own popups; only close the drawer when none is open.
    editor.addCommand(monaco.KeyCode.Escape, () => cb.current.onEscape?.(), '!suggestWidgetVisible && !findWidgetVisible && !parameterHintsVisible')
    editor.onDidChangeModelContent(() => {
      const text = editor.getValue()
      showApiFor(text)
      cb.current.onChange?.(text)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => saveDraft(text), AUTOSAVE_MS)
    })
    showApiFor(editor.getValue())
    void save() // run whatever was there last session
  }

  return (
    <MonacoEditor
      defaultLanguage="typescript"
      defaultPath="lab.ts"
      defaultValue={loadDraft() ?? starter}
      theme="extends-lab"
      beforeMount={defineTheme}
      onMount={mount}
      options={{
        fontSize: 15, fontFamily: 'JetBrains Mono, monospace', minimap: { enabled: false }, automaticLayout: true,
        scrollBeyondLastLine: false, padding: { top: 12 }, renderLineHighlight: 'none', lineNumbersMinChars: 3,
      }}
    />
  )
}

function defineTheme(m: typeof monaco) {
  // Colours from the lab palette (reference/morph-lab.html code block).
  m.editor.defineTheme('extends-lab', {
    base: 'vs-dark', inherit: true,
    rules: [
      { token: 'keyword', foreground: 'ff8fab' },
      { token: 'type.identifier', foreground: '8fd8ff' },
      { token: 'identifier', foreground: 'e4e6ff' },
      { token: 'string', foreground: 'b8f0a0' },
      { token: 'number', foreground: 'ffe066' },
      { token: 'comment', foreground: '8a8db0', fontStyle: 'italic' },
    ],
    colors: {
      'editor.background': '#0f101f',
      'editor.foreground': '#e4e6ff',
      'editorLineNumber.foreground': '#3a3d66',
      'editorLineNumber.activeForeground': '#9b9dbc',
      'editorCursor.foreground': '#ff86a3',
      'editor.selectionBackground': '#2e3152',
    },
  })
}

// ponytail: localStorage draft only; IndexedDB + 20-version history comes after phase 0
function saveDraft(src: string) {
  try { localStorage.setItem(DRAFT_KEY, src) } catch { /* storage blocked: keep playing */ }
}
function loadDraft(): string | null {
  try { return localStorage.getItem(DRAFT_KEY) } catch { return null }
}
/** A new player (new starter) starts from the generated starter code, not an old draft. */
export function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY) } catch { /* nothing to clear */ }
}
