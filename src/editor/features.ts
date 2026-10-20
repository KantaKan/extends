// What concepts the player's code actually uses (for quests that teach them). Comments don't count.

export const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

export type CodeFeatures = { loop: boolean; if: boolean; function: boolean; this: boolean }

export function codeFeatures(src: string): CodeFeatures {
  const code = stripComments(src)
  return {
    loop: /\b(for|while)\s*\(|\bdo\s*\{|\.forEach\s*\(/.test(code),
    if: /\bif\s*\(/.test(code),
    function: reusesAFunction(code),
    // `this.hunger`: each creature reading its *own* value, the point of the this lesson
    this: /\bthis\.hunger\b/.test(code),
  }
}

const KEYWORD_FN = /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g
const ARROW_OR_EXPR_FN = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/g

/** A function the player declared (`function f` / `const f = () =>` / `const f = function`) and calls at least twice. */
function reusesAFunction(code: string): boolean {
  const declared = [
    ...[...code.matchAll(KEYWORD_FN)].map((m) => ({ name: m[1]!, keyword: true })),
    ...[...code.matchAll(ARROW_OR_EXPR_FN)].map((m) => ({ name: m[1]!, keyword: false })),
  ]
  return declared.some(({ name, keyword }) => {
    const call = new RegExp(`(?<![\\w$.])${name.replace(/\$/g, '\\$')}\\s*\\(`, 'g')
    const uses = [...code.matchAll(call)].length
    return uses - (keyword ? 1 : 0) >= 2 // `function f(` itself looks like a call
  })
}
