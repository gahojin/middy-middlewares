import type middy from '@middy/core'
import type { DynamoDBBatchItemFailure, DynamoDBBatchResponse, DynamoDBStreamEvent } from 'aws-lambda'

type Options = {
  logger?: (message?: any, ...optionalParams: any[]) => void
}

const defaults: Options = {
  logger: console.error,
}

const dynamodbPartialBatchFailureMiddleware = (options: Options = {}): middy.MiddlewareObj<DynamoDBStreamEvent, DynamoDBBatchResponse> => {
  const { logger } = { ...defaults, ...options }

  const afterFn: middy.MiddlewareFn<DynamoDBStreamEvent, PromiseSettledResult<void>[] | DynamoDBBatchResponse> = (request) => {
    const {
      event: { Records },
      response,
    } = request

    if (!response || !Array.isArray(response)) {
      return
    }

    const batchItemFailures: DynamoDBBatchItemFailure[] = []
    for (const [idx, record] of Records.entries()) {
      const itemIdentifier = record.dynamodb?.SequenceNumber
      if (itemIdentifier === undefined) {
        continue
      }
      const result = response[idx]
      if (result.status === 'fulfilled') {
        continue
      }
      batchItemFailures.push({ itemIdentifier })
      if (typeof logger === 'function') {
        logger(result.reason, record)
      }
    }
    request.response = { batchItemFailures }
  }

  const onErrorFn: middy.MiddlewareFn<DynamoDBStreamEvent, PromiseSettledResult<void>[] | DynamoDBBatchResponse> = async (request) => {
    const {
      event: { Records },
      response,
    } = request

    if (response !== undefined) {
      return
    }

    // 全てエラー扱いにする
    const recordPromises = Records.map(() => Promise.reject(request.error))
    request.response = await Promise.allSettled(recordPromises)

    afterFn(request)
  }

  return {
    after: afterFn,
    onError: onErrorFn,
  }
}

export default dynamodbPartialBatchFailureMiddleware
