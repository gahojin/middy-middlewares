import type middy from '@middy/core'
import { createError } from '@middy/util'
import type { ALBEvent, APIGatewayEvent, APIGatewayProxyEventV2 } from 'aws-lambda'
import jsonParser from './parser/json'
import urlencodeParser from './parser/urlencode'

type BodyParseFn<TResult = any> = (body: string, rawBody: string) => TResult

type BodyParser<TResult = any> = {
  contentType: RegExp
  parse: BodyParseFn<TResult>
  invalidMessage: string
}

type Options = {
  parsers: BodyParser[]
  disableContentTypeError: boolean
}

type RequestEvent = APIGatewayEvent | APIGatewayProxyEventV2 | ALBEvent

const defaultOptions: Options = {
  parsers: [jsonParser, urlencodeParser],
  disableContentTypeError: false,
}

const parser = (options: Partial<Options> = {}): middy.MiddlewareObj<RequestEvent> => {
  const opts: Options = { ...defaultOptions, ...options }
  const { parsers, disableContentTypeError } = opts

  const beforeFn: middy.MiddlewareFn<RequestEvent> = (request) => {
    const { headers, body } = request.event
    const contentType = headers?.['content-type'] ?? headers?.['Content-Type']

    const parser = parsers.find((parser) => {
      return contentType && parser.contentType.test(contentType)
    })
    if (!parser) {
      if (disableContentTypeError) {
        return
      }
      throw createError(415, 'Unsupported Media Type', {
        cause: { package: '@gahojin-inc/middy-http-body-parser', data: contentType },
      })
    }

    if (typeof body === 'undefined' || body === null) {
      throw createError(415, parser.invalidMessage, {
        cause: { package: '@gahojin-inc/middy-http-body-parser', data: body },
      })
    }

    try {
      const data = request.event.isBase64Encoded ? Buffer.from(body, 'base64').toString() : body

      request.event.body = parser.parse(data, body)
    } catch (err) {
      // UnprocessableEntity
      throw createError(415, parser.invalidMessage, {
        cause: { package: '@gahojin-inc/middy-http-body-parser', data: body, message: err instanceof Error ? err.message : err?.toString() },
      })
    }
  }

  return {
    before: beforeFn,
  }
}

export default parser
export type { BodyParser }
