import { defineConfig } from 'rolldown'
import baseConfig, { getInputIndexFiles } from '../../rolldown.base.config.js'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  ...baseConfig,
  external: [/^node:/, /^@middy\//, 'aws-lambda', 'valibot'],
  input: getInputIndexFiles(pkg.exports),
  platform: 'node',
})
