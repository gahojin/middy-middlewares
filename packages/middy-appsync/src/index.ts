import type middy from '@middy/core'
import type { AppSyncResolverEvent } from 'aws-lambda'
import { AppSyncError } from './error.js'

type AppSyncResponse = {
  data: unknown | null
  errorMessage?: string
  errorType?: string
}

type AppSyncResolverEvents<TArguments, TSource = Record<string, any> | null> =
  | AppSyncResolverEvent<TArguments, TSource>
  | AppSyncResolverEvent<TArguments, TSource>[]

type AppSyncMiddlewareObj = middy.MiddlewareObj<AppSyncResolverEvents<unknown, unknown>, AppSyncResponse | AppSyncResponse[]>

type AppSyncMiddlewareFn = middy.MiddlewareFn<AppSyncResolverEvents<unknown, unknown>, AppSyncResponse | AppSyncResponse[]>

const buildResponse = (response: unknown): AppSyncResponse => {
  if (response instanceof AppSyncError) {
    return {
      data: response.data,
      errorMessage: response.message,
      errorType: response.type,
    }
  }
  if (response instanceof Error) {
    return {
      data: null,
      errorMessage: response.message,
    }
  }
  return {
    data: response,
  }
}

const appSyncMiddleware = (): AppSyncMiddlewareObj => {
  const afterFn: AppSyncMiddlewareFn = (request) => {
    const { event, response } = request

    if (Array.isArray(event)) {
      // for BatchInvoke
      if (!Array.isArray(response) || event.length !== response.length) {
        throw new Error('BatchInvoke: The response does not match the request payload')
      }
      request.response = response.map(buildResponse)
    } else {
      request.response = buildResponse(response)
    }
  }

  const onErrorFn: AppSyncMiddlewareFn = (request) => {
    const { event, error, response } = request

    if (response !== undefined) {
      return
    }

    // 全てエラー扱いにする
    const resp = buildResponse(error)
    if (Array.isArray(event)) {
      // for BatchInvoke
      const tmp = new Array(event.length)
      request.response = tmp.fill(resp)
    } else {
      request.response = resp
    }
  }

  return {
    after: afterFn,
    onError: onErrorFn,
  }
}

export type { AppSyncResponse, AppSyncResolverEvents }
export default appSyncMiddleware
