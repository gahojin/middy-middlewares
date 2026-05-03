import { mergeConfig } from 'vite'
import baseConfig from '../../vite.config.ts'

export default mergeConfig(baseConfig, {
  build: {
    lib: {
      entry: ['src/index.ts', 'src/parser/json.ts', 'src/parser/urlencode.ts'],
      formats: ['es'],
    },
    rolldownOptions: {
      platform: 'node',
      external: [/^node:/, /^@middy\//, 'aws-lambda'],
    },
  },
})
