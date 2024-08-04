import type middy from '@middy/core'
import type { AppSyncResolverEvent } from 'aws-lambda'

class AppSyncError extends Error {
  readonly type: string

  constructor(message: string, type = 'UnknownError') {
    super(message)
    this.type = type
  }
}

type AppSyncBatchResponse = {
  data: unknown | null
  errorMessage?: string
  errorType?: string
}

type AppSyncResolverEvents<TArguments, TSource = Record<string, any> | null> =
  | AppSyncResolverEvent<TArguments, TSource>
  | AppSyncResolverEvent<TArguments, TSource>[]

type AppSyncMiddlewareObj = middy.MiddlewareObj<AppSyncResolverEvents<unknown, unknown>, unknown | AppSyncBatchResponse[]>

type AppSyncMiddlewareFn = middy.MiddlewareFn<AppSyncResolverEvents<unknown, unknown>, unknown | AppSyncBatchResponse[]>

type BuildResponseFn = <RESPONSE = unknown>(response: RESPONSE | Error, batchInvoke: boolean) => RESPONSE | AppSyncBatchResponse | Error

type Options = {
  buildResponse?: BuildResponseFn
}

const defaultBuildResponse: BuildResponseFn = <RESPONSE>(response: RESPONSE | Error, batchInvoke: boolean) => {
  if (batchInvoke) {
    if (response instanceof AppSyncError) {
      return {
        data: null,
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
  return response
}

const appSyncMiddleware = (opts: Options = {}): AppSyncMiddlewareObj => {
  const buildResponse = opts.buildResponse ?? defaultBuildResponse

  const afterFn: AppSyncMiddlewareFn = (request) => {
    const { event, response } = request

    if (Array.isArray(event)) {
      // for BatchInvoke
      if (!Array.isArray(response) || event.length !== response.length) {
        throw new Error('BatchInvoke: The response does not match the request payload')
      }
      request.response = response.map((r) => buildResponse(r, true))
    } else {
      const resp = buildResponse(response, false)
      if (resp instanceof Error) {
        throw resp
      }
      request.response = resp
    }
  }

  const onErrorFn: AppSyncMiddlewareFn = (request) => {
    const { event, error, response } = request

    if (response !== undefined) {
      return
    }

    const isBatchInvoke = Array.isArray(event)
    const resp = buildResponse(error, isBatchInvoke)
    if (isBatchInvoke) {
      // 全てエラー扱いにする
      const tmp = new Array(event.length)
      request.response = tmp.fill(resp)
    } else if (!(resp instanceof Error)) {
      request.response = resp
    }
  }

  return {
    after: afterFn,
    onError: onErrorFn,
  }
}

export type { AppSyncBatchResponse, BuildResponseFn, AppSyncResolverEvents }
export { appSyncMiddleware as appSync, AppSyncError }
