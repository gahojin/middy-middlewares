import type middy from '@middy/core'
import type { AppSyncResolverEvent } from 'aws-lambda'

export class AppSyncError extends Error {
  readonly type: string

  constructor(message: string, type = 'UnknownError') {
    super(message)
    this.type = type
  }
}

export type AppSyncBatchResponse<TData = any> = {
  data: TData | null
  errorMessage?: string
  errorType?: string
}

export type AppSyncResolverEvents<TArguments, TSource = Record<string, any> | null> =
  | AppSyncResolverEvent<TArguments, TSource>
  | AppSyncResolverEvent<TArguments, TSource>[]

export type BuildResponseFn<TResponse = any> = (
  response: TResponse | Error | null,
  batchInvoke: boolean,
) => AppSyncBatchResponse<TResponse> | TResponse | Error | null

type Options<TResponse = any> = {
  buildResponse?: BuildResponseFn<TResponse>
}

const defaultBuildResponse: BuildResponseFn = <TResponse>(response: TResponse | Error, batchInvoke: boolean) => {
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

export default <TArguments = any, TResponse = any>(opts: Options<TResponse> = {}): middy.MiddlewareObj<AppSyncResolverEvents<TArguments>> => {
  const buildResponse: BuildResponseFn<TResponse> = opts.buildResponse ?? defaultBuildResponse

  const afterFn: middy.MiddlewareFn = (request) => {
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

  const onErrorFn: middy.MiddlewareFn = (request) => {
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
