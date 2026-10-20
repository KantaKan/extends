import { monaco } from './monaco'
import CLASS_DTS from './api/class.d.ts?raw'
import COMMON_DTS from './api/common.d.ts?raw'
import SCRIPT_DTS from './api/script.d.ts?raw'
import { lineMap } from './sourcemap'

const ts = monaco.typescript
ts.typescriptDefaults.setCompilerOptions({
  target: ts.ScriptTarget.ESNext, // QuickJS runs modern JS; class fields stay as written
  lib: ['es2022'], // no DOM: the sandbox has no window/fetch either
  useDefineForClassFields: true,
  sourceMap: true, // errors must point at the player's line, not the emitted one
  strict: false, // acts 1-3 are plain JS; types arrive in act 4
  noImplicitAny: false,
})
/**
 * Autocomplete shows the API of the mode the code is in: a file without classes drives `slime`
 * (act 1); a file with a class gets `Creature` (and no global `slime` to clash with `const slime`).
 */
let shownMode: 'class' | 'script' | null = null
export function showApiFor(source: string) {
  const mode = /\bclass\s+[A-Za-z_$]/.test(source) ? 'class' : 'script'
  if (mode === shownMode) return
  shownMode = mode
  ts.typescriptDefaults.setExtraLibs([
    { content: COMMON_DTS, filePath: 'file:///api/common.d.ts' },
    { content: mode === 'class' ? CLASS_DTS : SCRIPT_DTS, filePath: `file:///api/${mode}.d.ts` },
  ])
}
showApiFor('')

/** `lines[jsLine]` = the line in the editor. */
export type Transpiled = { ok: true; js: string; lines: number[]; source: string } | { ok: false; message: string; line: number }

/** TS → JS with Monaco's own TypeScript worker. Only syntax errors block; type errors are hints. */
export async function transpile(model: monaco.editor.ITextModel): Promise<Transpiled> {
  const uri = model.uri.toString()
  const worker = await (await tsWorker())(model.uri)
  const [first] = await worker.getSyntacticDiagnostics(uri)
  if (first) {
    const text = typeof first.messageText === 'string' ? first.messageText : first.messageText.messageText
    return { ok: false, message: text, line: model.getPositionAt(first.start ?? 0).lineNumber }
  }
  const out = await worker.getEmitOutput(uri)
  const js = out.outputFiles.find((f) => f.name.endsWith('.js'))?.text ?? ''
  const map = out.outputFiles.find((f) => f.name.endsWith('.map'))?.text
  return { ok: true, js, source: model.getValue(), lines: map ? lineMap((JSON.parse(map) as { mappings: string }).mappings) : [] }
}

/** Monaco loads its TS mode lazily; right after mount it throws "TypeScript not registered". Wait for it. */
// Up to ~15 s: on a cold start (first visit, dev server still bundling) the TS mode can take seconds.
async function tsWorker(tries = 300) {
  for (;;) {
    try { return await ts.getTypeScriptWorker() } catch (e) {
      if (--tries <= 0) throw e
      await new Promise((r) => setTimeout(r, 50))
    }
  }
}
