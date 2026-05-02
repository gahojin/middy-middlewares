import dts from 'vite-plugin-dts'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    dts({
      exclude: ['src/**/*.test.ts'],
    }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    ssr: true,
    lib: {
      entry: ['src/index.ts', 'src/parser/json', 'src/parser/urlencode'],
      formats: ['es'],
    },
    minify: false,
    sourcemap: true,
    rolldownOptions: {
      treeshake: true,
      output: {
        cleanDir: true,
        comments: false,
        preserveModules: true,
      },
      platform: 'node',
      external: [/^node:/, /^@middy\//, 'aws-lambda'],
      optimization: {
        inlineConst: { mode: 'all', pass: 5 },
      },
      experimental: {
        nativeMagicString: true,
      },
    },
  },
})
