import path from 'node:path'
import { defineConfig } from 'rolldown'
import IsolatedDecl from 'unplugin-isolated-decl/rolldown'
import pkg from './package.json'

const inputIndexFiles = Object.keys(pkg.exports)
  .filter((entry) => !entry.endsWith('.json'))
  .map((entry) => {
    const name = path.basename(entry)
    return name.endsWith('.') ? [`${name}/index`, path.resolve('src', `${name}/index.ts`)] : [entry, path.resolve('src', `${entry}.ts`)]
  })

export default defineConfig([
  {
    platform: 'node',
    external: [/^node:/, /^@middy\//, 'aws-lambda'],
    treeshake: true,
    input: Object.fromEntries(inputIndexFiles),
    output: [
      { format: 'esm', entryFileNames: '[name].mjs', sourcemap: true },
      { format: 'cjs', entryFileNames: '[name].cjs', sourcemap: true, exports: 'named' },
    ],
    plugins: [IsolatedDecl()],
  },
])
