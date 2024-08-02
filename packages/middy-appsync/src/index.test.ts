import { AppSyncError } from '@/error'
import appSync, { type AppSyncResolverEvents } from '@/index'
import middy from '@middy/core'
import type { AppSyncResolverEvent } from 'aws-lambda'
import mockContext from 'aws-lambda-mock-context'

type TestAppSyncArgument = {
  field1: string
  field2: number
}

const dummyEvent: AppSyncResolverEvents<TestAppSyncArgument> = {
  arguments: {
    field1: 'test',
    field2: 123,
  },
  source: null,
  request: {
    headers: {},
    domainName: null,
  },
  info: {
    selectionSetList: [],
    selectionSetGraphQL: '',
    parentTypeName: '',
    fieldName: '',
    variables: {},
  },
  prev: null,
  stash: {},
}

const lambdaBaseHandler = (event: AppSyncResolverEvent<TestAppSyncArgument>) => {
  if (event.arguments.field1 === 'rejectAppSync') {
    return new AppSyncError('appsyncError', 'type', { value: 'dummy' })
  }
  if (event.arguments.field1 === 'reject') {
    return new Error('reject')
  }
  return event.arguments
}
const lambdaHandler = (event: AppSyncResolverEvents<TestAppSyncArgument>) => {
  if (Array.isArray(event)) {
    return event.map(lambdaBaseHandler)
  }
  return lambdaBaseHandler(event)
}

describe('middleware', () => {
  it('レスポンスがdataフィールドに格納されること', async () => {
    const handler = middy(lambdaHandler).use(appSync())

    const response = await handler(dummyEvent, mockContext())
    expect(response).toEqual({
      data: {
        field1: 'test',
        field2: 123,
      },
    })
  })

  it('レスポンスがAppSyncErrorの時は、エラーフィールドが格納されること', async () => {
    const handler = middy(lambdaHandler).use(appSync())

    const response = await handler({ ...dummyEvent, arguments: { field1: 'rejectAppSync', field2: 123 } }, mockContext())
    expect(response).toEqual({
      data: { value: 'dummy' },
      errorMessage: 'appsyncError',
      errorType: 'type',
    })
  })

  it('レスポンスがAppSyncError例外発生時は、エラーフィールドが格納されること', async () => {
    const handler = middy(lambdaHandler)
      .before(() => {
        throw new AppSyncError('before', 'ERROR', { dummy: 'test' })
      })
      .use(appSync())

    const response = await handler(dummyEvent, mockContext())
    expect(response).toEqual({
      data: { dummy: 'test' },
      errorMessage: 'before',
      errorType: 'ERROR',
    })
  })

  it('レスポンスがErrorの時は、エラーフィールドが格納されること', async () => {
    const handler = middy(lambdaHandler).use(appSync())

    const response = await handler({ ...dummyEvent, arguments: { field1: 'reject', field2: 123 } }, mockContext())
    expect(response).toEqual({
      data: null,
      errorMessage: 'reject',
    })
  })

  it('レスポンスが例外発生時は、エラーフィールドが格納されること', async () => {
    const handler = middy(lambdaHandler)
      .before(() => {
        throw new Error('before')
      })
      .use(appSync())

    const response = await handler(dummyEvent, mockContext())
    expect(response).toEqual({
      data: null,
      errorMessage: 'before',
    })
  })

  it('バッチイベント時のレスポンスが、dataフィールドに格納され、配列になること', async () => {
    const handler = middy(lambdaHandler).use(appSync())

    const response = await handler([dummyEvent, { ...dummyEvent, arguments: { field1: 'dummy', field2: 456 } }], mockContext())
    expect(response).toEqual([
      {
        data: {
          field1: 'test',
          field2: 123,
        },
      },
      {
        data: {
          field1: 'dummy',
          field2: 456,
        },
      },
    ])
  })

  it('バッチイベント時のレスポンスがAppSyncError例外発生時は、エラーフィールドが格納されること', async () => {
    const handler = middy(lambdaHandler)
      .before(() => {
        throw new AppSyncError('before', 'ERROR', { dummy: 'test' })
      })
      .use(appSync())

    const response = await handler([dummyEvent, dummyEvent], mockContext())
    expect(response).toEqual([
      {
        data: { dummy: 'test' },
        errorMessage: 'before',
        errorType: 'ERROR',
      },
      {
        data: { dummy: 'test' },
        errorMessage: 'before',
        errorType: 'ERROR',
      },
    ])
  })

  it('バッチイベント時のレスポンスがAppSyncErrorの時は、エラーフィールドが格納されること', async () => {
    const handler = middy(lambdaHandler).use(appSync())

    const response = await handler([dummyEvent, { ...dummyEvent, arguments: { field1: 'rejectAppSync', field2: 456 } }], mockContext())
    expect(response).toEqual([
      {
        data: {
          field1: 'test',
          field2: 123,
        },
      },
      {
        data: { value: 'dummy' },
        errorMessage: 'appsyncError',
        errorType: 'type',
      },
    ])
  })

  it('バッチイベント時のレスポンスが例外発生時は、エラーフィールドが格納されること', async () => {
    const handler = middy(lambdaHandler)
      .before(() => {
        throw new Error('before')
      })
      .use(appSync())

    const response = await handler([dummyEvent, dummyEvent], mockContext())
    expect(response).toEqual([
      {
        data: null,
        errorMessage: 'before',
      },
      {
        data: null,
        errorMessage: 'before',
      },
    ])
  })

  it('バッチイベント時のレスポンスがErrorの時は、エラーフィールドが格納されること', async () => {
    const handler = middy(lambdaHandler).use(appSync())

    const response = await handler([dummyEvent, { ...dummyEvent, arguments: { field1: 'reject', field2: 456 } }], mockContext())
    expect(response).toEqual([
      {
        data: {
          field1: 'test',
          field2: 123,
        },
      },
      {
        data: null,
        errorMessage: 'reject',
      },
    ])
  })
})
