import type crypto from 'node:crypto'
import type middy from '@middy/core'
import { createError, normalizeHttpResponse } from '@middy/util'
import { calcMessageMAC } from './mac'

type Event = {
  headers: Partial<Record<string, string>>
  isBase64Encoded?: boolean
  body?: string
}

type Result = {
  headers: Partial<Record<string, string>>
  body: unknown
}

type KeyType = crypto.BinaryLike | crypto.KeyObject

type SignatureOption<TEvent extends Event = Event> = {
  headerName: string
  algorithm: string
  key: KeyType | ((request: middy.Request<TEvent, unknown, Error>) => KeyType | PromiseLike<KeyType>)
}

type Options<TEvent extends Event = Event> = {
  input?: SignatureOption<TEvent>
  output?: SignatureOption<TEvent>
}

const generateKey = async (request: middy.Request<Event, unknown, Error>, key: SignatureOption['key']): Promise<KeyType> => {
  return typeof key === 'function' ? await key(request) : key
}

export default <TEvent extends Event = Event>(options: Options): middy.MiddlewareObj<TEvent, Result, Error> => {
  const { input, output } = options

  const beforeFn: middy.MiddlewareFn<TEvent> = async (request) => {
    if (!input) {
      return
    }
    const { algorithm, key, headerName } = input
    const { headers, body } = request.event

    // Base64エンコードされている場合、デコードする
    const data = body && request.event.isBase64Encoded ? Buffer.from(body, 'base64').toString() : body
    request.event.body = data
    request.event.isBase64Encoded = false

    const signature = headers[headerName]
    if (signature && data) {
      const macKey = await generateKey(request, key)
      const mac = calcMessageMAC(algorithm, macKey, data)
      if (mac === signature) {
        return
      }
    }
    throw createError(400, 'Bad signature', {
      cause: {
        package: '@gahojin-inc/middy-http-signature',
      },
    })
  }

  const afterFn: middy.MiddlewareFn<TEvent, Result, Error> = async (request) => {
    if (!output) {
      return
    }
    const { algorithm, key, headerName } = output
    normalizeHttpResponse(request)

    const body = request.response?.body
    const headers = request.response?.headers
    if (typeof body !== 'string' || !headers) {
      return
    }
    const macKey = await generateKey(request, key)
    headers[headerName] = calcMessageMAC(algorithm, macKey, body)
  }
  return {
    before: input ? beforeFn : undefined,
    after: output ? afterFn : undefined,
  }
}
