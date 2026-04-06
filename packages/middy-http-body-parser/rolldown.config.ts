import path from 'node:path'
import { defineConfig } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'
import pkg from './package.json'

const inputIndexFiles = Object.keys(pkg.exports)
  .filter((entry) => !entry.endsWith('.json'))
  .map((entry) => {
    const name = path.basename(entry)
    const entryName = name === '.' ? 'index' : path.relative('.', entry)
    return [entryName, path.resolve('src', `${entryName}.ts`)]
  })

export default defineConfig([
  {
    platform: 'node',
    external: [/^node:/, /^@middy\//, 'aws-lambda'],
    treeshake: true,
    input: Object.fromEntries(inputIndexFiles),
    output: [{ dir: 'dist', format: 'es', sourcemap: true, cleanDir: true }],
    plugins: [dts()],
  },
])
