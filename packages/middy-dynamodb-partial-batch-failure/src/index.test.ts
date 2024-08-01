import dynamodbPartialBatchFailure from '@/index'
import middy from '@middy/core'
import createEvent from '@serverless/event-mocks'
import type { DynamoDBStreamEvent } from 'aws-lambda'

const lambdaHandler = async (event: DynamoDBStreamEvent) => {
  // biome-ignore lint/suspicious/useAwait:
  const processedRecords = event.Records.map(async (record) => {
    if (record.dynamodb?.NewImage?.resolveOrReject.S === 'resolve') {
      return
    }
    throw new Error('record')
  })
  return await Promise.allSettled(processedRecords)
}

const context = {
  getRemainingTimeInMillis: () => 1000,
  callbackWaitsForEmptyEventLoop: true,
  functionVersion: '$LATEST',
  functionName: 'lambda',
  memoryLimitInMB: '128',
  logGroupName: '/aws/lambda/lambda',
  logStreamName: 'yyyy/mm/dd/[$LATEST]xxxxxxxxxxxxxxxxxxxxxx',
  clientContext: undefined,
  identity: undefined,
  invokedFunctionArn: 'arn:aws:lambda:ca-central-1:000000000000:function:lambda',
  awsRequestId: '00000000-0000-0000-0000-0000000000000',
  done: () => {},
  fail: () => {},
  succeed: () => {},
}

describe('middleware', () => {
  it('失敗したレコードのみが返されること', async () => {
    const event = createEvent('aws:dynamo', {
      Records: [
        {
          dynamodb: {
            SequenceNumber: '111',
            NewImage: {
              resolveOrReject: { S: 'reject' },
            },
          },
        },
      ],
    })
    const logger = vi.fn()

    const handler = middy(lambdaHandler).use(dynamodbPartialBatchFailure({ logger }))

    const response = await handler(event, context)
    expect(response).toEqual({
      batchItemFailures: [{ itemIdentifier: '111' }],
    })
    expect(logger).toBeCalledTimes(1)
  })

  it('実行にしたレコードのみが返されること', async () => {
    const event = createEvent('aws:dynamo', {
      Records: [
        {
          dynamodb: {
            SequenceNumber: '222',
            NewImage: {
              resolveOrReject: { S: 'resolve' },
            },
          },
        },
      ],
    })
    const logger = vi.fn()

    const handler = middy(lambdaHandler).use(dynamodbPartialBatchFailure({ logger }))

    const response = await handler(event, context)
    expect(response).toEqual({ batchItemFailures: [] })
    expect(logger).not.toBeCalled()
  })

  it('失敗したレコードのシーケンス番号のみが返されること', async () => {
    const event = createEvent('aws:dynamo', {
      Records: [
        {
          dynamodb: {
            SequenceNumber: '111',
            NewImage: {
              resolveOrReject: { S: 'reject' },
            },
          },
        },
        {
          dynamodb: {
            SequenceNumber: '222',
            NewImage: {
              resolveOrReject: { S: 'resolve' },
            },
          },
        },
      ],
    })
    const logger = vi.fn()

    const handler = middy(lambdaHandler).use(dynamodbPartialBatchFailure({ logger }))

    const response = await handler(event, context)
    expect(response).toEqual({
      batchItemFailures: [{ itemIdentifier: '111' }],
    })
    expect(logger).toBeCalledTimes(1)
  })

  it('エラーがスローされた場合、全てのシーケンス番号が返されること', async () => {
    const event = createEvent('aws:dynamo', {
      Records: [
        {
          dynamodb: {
            SequenceNumber: '111',
            NewImage: {
              resolveOrReject: { S: 'reject' },
            },
          },
        },
        {
          dynamodb: {
            SequenceNumber: '222',
            NewImage: {
              resolveOrReject: { S: 'resolve' },
            },
          },
        },
      ],
    })
    const logger = vi.fn()

    const handler = middy(lambdaHandler)
      .before(() => {
        throw new Error('before')
      })
      .use(dynamodbPartialBatchFailure({ logger }))

    const response = await handler(event, context)
    expect(response).toEqual({
      batchItemFailures: [{ itemIdentifier: '111' }, { itemIdentifier: '222' }],
    })
    expect(logger).toBeCalledTimes(2)
  })
})
