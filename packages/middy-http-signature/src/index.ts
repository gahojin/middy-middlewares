import type crypto from 'node:crypto'
import type middy from '@middy/core'
import { createError, normalizeHttpResponse } from '@middy/util'
import { calcMessageMAC } from './mac'

type KeyType = crypto.BinaryLike | crypto.KeyObject

type SignatureOption = {
  headerName: string
  algorithm: string
  key: KeyType | ((request: middy.Request) => KeyType | PromiseLike<KeyType>)
}

type Options = {
  input?: SignatureOption
  output?: SignatureOption
}

const generateKey = async (request: middy.Request, key: SignatureOption['key']): Promise<KeyType> => {
  return typeof key === 'function' ? await key(request) : key
}

export default (options: Options): middy.MiddlewareObj => {
  const { input, output } = options

  const beforeFn: middy.MiddlewareFn = async (request) => {
    if (!input) {
      return
    }
    const { algorithm, key, headerName } = input
    const { headers, body } = request.event

    // Base64エンコードされている場合、デコードする
    const data = request.event.isBase64Encoded ? Buffer.from(body, 'base64').toString() : body
    request.event.body = data
    request.event.isBase64Encoded = false

    const signature = headers[headerName]
    if (signature) {
      const macKey = await generateKey(request, key)
      const mac = calcMessageMAC(algorithm, macKey, data)
      if (mac !== signature) {
        throw createError(400, 'Bad signature', {
          cause: {
            package: '@gahojin-inc/middy-http-signature',
          },
        })
      }
    }
  }

  const afterFn: middy.MiddlewareFn = async (request) => {
    if (!output) {
      return
    }
    const { algorithm, key, headerName } = output
    normalizeHttpResponse(request)

    const body = request.response.body
    if (typeof body !== 'string') {
      return
    }
    const macKey = await generateKey(request, key)
    request.response.headers[headerName] = calcMessageMAC(algorithm, macKey, body)
  }
  return {
    before: input ? beforeFn : undefined,
    after: output ? afterFn : undefined,
  }
}
