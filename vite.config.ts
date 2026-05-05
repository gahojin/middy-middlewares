import dts from 'unplugin-dts/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    dts({
      exclude: ['src/**/*.test.ts', 'src/**/*.bench.ts'],
    }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    minify: false,
    sourcemap: true,
    rolldownOptions: {
      treeshake: true,
      output: {
        cleanDir: true,
        comments: false,
        preserveModules: true,
      },
      optimization: {
        inlineConst: { mode: 'all', pass: 5 },
      },
      experimental: {
        nativeMagicString: true,
      },
    },
  },
})
