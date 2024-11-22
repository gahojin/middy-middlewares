import { type Options, defineConfig } from 'tsup'
import pkg from './package.json'

const banner = `/**
 * ${pkg.name}
 * ${pkg.description}
 * @version: ${pkg.version}
 * @author: ${pkg.author}
 * @license: ${pkg.license}
 **/
`

export default defineConfig((options) => {
  const commonOptions: Partial<Options> = {
    entry: ['src/index.ts'],
    sourcemap: true,
    treeshake: 'smallest',
    dts: true,
    banner: {
      js: banner,
    },
    ...options,
  }

  return [
    {
      ...commonOptions,
      format: ['esm'],
      outExtension: () => ({ js: '.mjs' }),
      clean: true,
    },
    {
      ...commonOptions,
      format: ['cjs'],
      cjsInterop: true,
      outDir: './dist/cjs/',
      outExtension: () => ({ js: '.cjs' }),
    },
  ]
})
