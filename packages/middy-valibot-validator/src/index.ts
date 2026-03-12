import type middy from '@middy/core'
import { createError } from '@middy/util'
import type { GenericSchema } from 'valibot'
import * as v from 'valibot'

type Options<TEvent extends GenericSchema, TResponse extends GenericSchema, TContext extends GenericSchema> = {
  eventSchema?: TEvent
  responseSchema?: TResponse
  contextSchema?: TContext
  language?: string
  errorResponse?: (statusCode: number, message: string, issues?: [v.BaseIssue<unknown>, ...v.BaseIssue<unknown>[]]) => any
}

type ParserOutput<TSchema extends GenericSchema> = v.InferOutput<TSchema>

const validator = <TEvent extends GenericSchema, TResponse extends GenericSchema, TContext extends GenericSchema, TErr extends Error = Error>(
  options: Options<TEvent, TResponse, TContext> = {},
): middy.MiddlewareObj<
  undefined extends TEvent ? unknown : ParserOutput<TEvent>,
  undefined extends TResponse ? unknown : ParserOutput<TResponse>,
  TErr
> => {
  const opts = { language: 'en', ...options }
  const { eventSchema, contextSchema, responseSchema, language } = opts

  const errorResponse =
    opts.errorResponse ??
    ((statusCode, message, issues) => {
      throw createError(statusCode, message, {
        cause: {
          package: '@gahojin-inc/middy-valibot-validator',
          data: issues,
        },
      })
    })

  const beforeFn: middy.MiddlewareFn<
    undefined extends TEvent ? unknown : ParserOutput<TEvent>,
    undefined extends TResponse ? unknown : ParserOutput<TResponse>,
    TErr
  > = async (request) => {
    if (eventSchema) {
      const validEvent = await v.safeParseAsync(eventSchema, request.event, { lang: language })
      if (validEvent.success) {
        request.event = validEvent.output
      } else {
        return errorResponse(400, 'Event object failed validation', validEvent.issues)
      }
    }

    if (contextSchema) {
      const validContext = await v.safeParseAsync(contextSchema, request.context, { lang: language })
      if (validContext.success) {
        Object.assign(request.context, validContext.output)
      } else {
        return errorResponse(400, 'Context object failed validation', validContext.issues)
      }
    }
  }

  const afterFn: middy.MiddlewareFn<
    undefined extends TEvent ? unknown : ParserOutput<TEvent>,
    undefined extends TResponse ? unknown : ParserOutput<TResponse>,
    TErr
  > = async (request) => {
    if (responseSchema) {
      const actualRespose = request.response
      const validResponse = await v.safeParseAsync(responseSchema, actualRespose, { lang: language })
      if (validResponse.success) {
        request.response = validResponse.output
      } else {
        return errorResponse(400, 'Response object failed validation', validResponse.issues)
      }
    }
  }
  return {
    before: (eventSchema ?? contextSchema) ? beforeFn : undefined,
    after: responseSchema ? afterFn : undefined,
  }
}

export default validator
