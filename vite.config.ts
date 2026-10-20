import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './', // relative asset paths: the build works from any sub-path (GitHub Pages serves it at /extends/)
  plugins: [react()],
  worker: { format: 'es' },
  test: { environment: 'node' },
})
