import { mergeConfig } from 'vite'
import baseConfig from '../../vite.config.ts'

export default mergeConfig(baseConfig, {
  build: {
    lib: {
      entry: ['src/index.ts'],
      formats: ['es'],
    },
    rolldownOptions: {
      platform: 'node',
      external: [/^node:/, /^@middy\//, 'aws-lambda', 'valibot'],
    },
  },
})
