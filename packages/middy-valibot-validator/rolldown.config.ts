import { defineConfig } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'

export default defineConfig([
  {
    platform: 'node',
    external: [/^node:/, /^@middy\//, 'aws-lambda', 'valibot'],
    treeshake: true,
    input: 'src/index.ts',
    output: [{ dir: 'dist', format: 'es', sourcemap: true, cleanDir: true }],
    plugins: [dts()],
  },
])
