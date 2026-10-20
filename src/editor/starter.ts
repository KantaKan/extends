/** The first code a new player sees: act 1, plain JavaScript driving `slime` (no class yet). */
export function starterCode(comments: string[]): string {
  return comments.map((c) => `// ${c}`).join('\n') + '\n'
}
