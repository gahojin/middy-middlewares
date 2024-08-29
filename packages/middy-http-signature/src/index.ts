import type crypto from 'node:crypto'
import { calcMessageMAC } from '@/mac'
import type middy from '@middy/core'
import { createError, normalizeHttpResponse } from '@middy/util'

type SignatureOption = {
  headerName: string
  algorithm: string
  key: crypto.BinaryLike | crypto.KeyObject
}

type Options = {
  input?: SignatureOption
  output?: SignatureOption
}

const httpSignatureMiddleware = (options: Options): middy.MiddlewareObj => {
  const { input, output } = options

  const beforeFn: middy.MiddlewareFn = (request) => {
    if (!input) {
      return
    }
    const { algorithm, key, headerName } = input
    const { headers, body } = request.event

    const signature = headers[headerName]
    if (signature) {
      const mac = calcMessageMAC(algorithm, key, body)
      if (mac !== signature) {
        throw createError(400, 'Bad signature', {
          cause: {
            package: '@gahojin-inc/middy-http-signature',
          },
        })
      }
    }
  }

  const afterFn: middy.MiddlewareFn = (request) => {
    if (!output) {
      return
    }
    const { algorithm, key, headerName } = output
    normalizeHttpResponse(request)

    const body = request.response.body
    if (typeof body !== 'string') {
      return
    }
    request.response.headers[headerName] = calcMessageMAC(algorithm, key, body)
  }
  return {
    before: input ? beforeFn : undefined,
    after: output ? afterFn : undefined,
  }
}

export default httpSignatureMiddleware
