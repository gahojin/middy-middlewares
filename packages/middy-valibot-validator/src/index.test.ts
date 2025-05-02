import middy from '@middy/core'
import validatorMiddleware from './index'
import '@valibot/i18n/ja'
import mockContext from '@gahojin-inc/aws-lambda-mock-context'
import * as v from 'valibot'

const contextSchema = v.object({
  getRemainingTimeInMillis: v.custom((input) => typeof input === 'function'),
  functionVersion: v.string(),
  functionName: v.string(),
  invokedFunctionArn: v.string(),
  memoryLimitInMB: v.string(),
  awsRequestId: v.string(),
  logGroupName: v.string(),
  logStreamName: v.string(),
  identity: v.optional(
    v.object({
      cognitoIdentityId: v.string(),
      cognitoIdentityPoolId: v.string(),
    }),
  ),
  clientContext: v.optional(
    v.object({
      'client.installation_id': v.string(),
      'client.app_title': v.string(),
      'client.app_version_name': v.string(),
      'client.app_version_code': v.string(),
      'client.app_package_name': v.string(),
      'env.platform_version': v.string(),
      'env.platform': v.string(),
      'env.make': v.string(),
      'env.model': v.string(),
      'env.locale': v.string(),
    }),
  ),
  callbackWaitsForEmptyEventLoop: v.boolean(),
})

describe('validator', () => {
  it('イベントオブジェクトのバリデーションが動作すること', async () => {
    const schema = v.object({
      body: v.object({
        string: v.string(),
        boolean: v.pipe(
          v.string(),
          v.transform((input) => Boolean(input)),
        ),
        integer: v.pipe(
          v.string(),
          v.transform((input) => Number(input)),
          v.integer(),
        ),
        number: v.pipe(
          v.string(),
          v.transform((input) => Number(input)),
        ),
      }),
    })

    const handler = middy()

    handler.use(
      validatorMiddleware({
        eventSchema: schema,
      }),
    )

    const event = {
      body: {
        string: JSON.stringify({ foo: 'bar' }),
        boolean: 'true',
        integer: '0',
        number: '0.1',
      },
    }

    const response = await handler(event, mockContext())
    expect(response).toBeUndefined()
  })

  it('イベントオブジェクトのフォーマットがチェックされること', async () => {
    const schema = v.object({
      body: v.object({
        date: v.pipe(v.string(), v.isoDate()),
        time: v.pipe(v.string(), v.isoTimeSecond()),
        'date-time': v.pipe(v.string(), v.isoTimestamp()),
        uri: v.pipe(v.string(), v.url()),
        email: v.pipe(v.string(), v.email()),
        ipv4: v.pipe(v.string(), v.ipv4()),
        ipv6: v.pipe(v.string(), v.ipv6()),
        uuid: v.pipe(v.string(), v.uuid()),
      }),
    })

    const handler = middy()

    const event = {
      body: {
        date: '2000-01-01',
        time: '00:00:00',
        'date-time': '2000-01-01T00:00:00.000Z',
        uri: 'https://example.org',
        email: 'username@example.org',
        ipv4: '127.0.0.1',
        ipv6: '2001:0db8:0000:0000:0000:ff00:0042:8329',
        uuid: '123e4567-e89b-12d3-a456-426614174000',
      },
    }

    handler.use(validatorMiddleware({ eventSchema: schema }))

    const response = await handler(event, mockContext())
    expect(response).toBeUndefined()
  })

  it('スキーマ不一致の場合、BadRequestとなること', async () => {
    const schema = v.object({
      body: v.string(),
      foo: v.string(),
    })

    const handler = middy()

    handler.use(validatorMiddleware({ eventSchema: schema }))

    // fooプロパティの型不一致
    const event = {
      body: JSON.stringify({ something: 'somethingelse' }),
      foo: 1,
    }

    await expect(() => handler(event, mockContext())).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 400,
        message: 'Event object failed validation',
        cause: {
          package: '@gahojin-inc/middy-valibot-validator',
          data: [
            expect.objectContaining({
              type: 'string',
              expected: 'string',
              received: '1',
              message: 'Invalid type: Expected string but received 1',
              path: [expect.objectContaining({ key: 'foo' })],
              lang: 'en',
            }),
          ],
        },
      }),
    )
  })

  it('スキーマ不一致の場合、BadRequestとなること (フィールドなし)', async () => {
    const schema = v.object({
      body: v.string(),
      foo: v.string(),
    })

    const handler = middy()

    handler.use(validatorMiddleware({ eventSchema: schema }))

    // fooプロパティの型不一致
    const event = {
      body: JSON.stringify({ something: 'somethingelse' }),
    }

    await expect(() => handler(event, mockContext())).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 400,
        message: 'Event object failed validation',
        cause: {
          package: '@gahojin-inc/middy-valibot-validator',
          data: [
            expect.objectContaining({
              type: 'object',
              expected: '"foo"',
              received: 'undefined',
              message: 'Invalid key: Expected "foo" but received undefined',
              path: [expect.objectContaining({ key: 'foo' })],
              lang: 'en',
            }),
          ],
        },
      }),
    )
  })

  const invalidTypeCases: Record<string, string> = {
    en: 'Invalid type: Expected string but received 1',
    ja: '無効な型: string を期待しましたが、 1 を受け取りました',
  }
  it.each(['en', 'ja'])('スキーマ不一致の場合、BadRequestとなること (異なる言語設定) (%s)', async (lang) => {
    const schema = v.object({
      body: v.string(),
      foo: v.string(),
    })

    const handler = middy()

    handler.use(validatorMiddleware({ eventSchema: schema, language: lang }))

    // fooプロパティが存在しない
    const event = {
      body: JSON.stringify({ something: 'somethingelse' }),
      foo: 1,
    }

    await expect(() => handler(event, mockContext())).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 400,
        message: 'Event object failed validation',
        cause: {
          package: '@gahojin-inc/middy-valibot-validator',
          data: [
            expect.objectContaining({
              message: invalidTypeCases[lang],
              path: [expect.objectContaining({ key: 'foo' })],
              type: 'string',
            }),
          ],
        },
      }),
    )
  })

  const invalidKeyCases: Record<string, string> = {
    en: 'Invalid key: Expected "foo" but received undefined',
    ja: '無効な型: "foo" を期待しましたが、 undefined を受け取りました',
  }
  it.each(['en', 'ja'])('スキーマ不一致の場合、BadRequestとなること (異なる言語設定 / フィールドなし) (%s)', async (lang) => {
    const schema = v.object({
      body: v.string(),
      foo: v.string(),
    })

    const handler = middy()

    handler.use(validatorMiddleware({ eventSchema: schema, language: lang }))

    // fooプロパティが存在しない
    const event = {
      body: JSON.stringify({ something: 'somethingelse' }),
    }

    await expect(() => handler(event, mockContext())).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 400,
        message: 'Event object failed validation',
        cause: {
          package: '@gahojin-inc/middy-valibot-validator',
          data: [
            expect.objectContaining({
              message: invalidKeyCases[lang],
              path: [expect.objectContaining({ key: 'foo' })],
              type: 'object',
            }),
          ],
        },
      }),
    )
  })

  it('スキーマ不一致の場合、BadRequestとなること (言語設定なし)', async () => {
    const schema = v.object({
      body: v.string(),
      foo: v.string(),
    })

    const handler = middy()

    handler.use(validatorMiddleware({ eventSchema: schema }))

    // fooプロパティが存在しない
    const event = {
      body: JSON.stringify({ something: 'somethingelse' }),
    }

    await expect(() => handler(event, mockContext())).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 400,
        message: 'Event object failed validation',
        cause: {
          package: '@gahojin-inc/middy-valibot-validator',
          data: [
            expect.objectContaining({
              // valibotのデフォルト言語となる
              message: 'Invalid key: Expected "foo" but received undefined',
              path: [expect.objectContaining({ key: 'foo' })],
              type: 'object',
            }),
          ],
        },
      }),
    )
  })

  it('contextオブジェクトのバリデーションが動作すること', async () => {
    const handler = middy()

    handler.use(validatorMiddleware({ contextSchema: contextSchema }))

    const response = await handler({}, mockContext())
    expect(response).toBeUndefined()
  })

  it('誤ったcontextオブジェクトの場合、BadRequestとなること', async () => {
    const handler = middy()

    handler
      .before((request) => {
        Object.assign(request.context, { callbackWaitsForEmptyEventLoop: 'fail' })
      })
      .use(validatorMiddleware({ contextSchema: contextSchema }))

    await expect(() => handler({}, mockContext())).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 400,
        message: 'Context object failed validation',
        cause: {
          package: '@gahojin-inc/middy-valibot-validator',
          data: [
            expect.objectContaining({
              // valibotのデフォルト言語となる
              message: 'Invalid type: Expected boolean but received "fail"',
              path: [expect.objectContaining({ key: 'callbackWaitsForEmptyEventLoop' })],
              type: 'boolean',
            }),
          ],
        },
      }),
    )
  })

  it('レスポンスオブジェクトのバリデーションが動作すること', async () => {
    const handler = middy().handler(() => ({
      body: 'Hello world',
      statusCode: 200,
    }))

    const schema = v.object({
      body: v.string(),
      statusCode: v.number(),
    })

    handler.use(validatorMiddleware({ responseSchema: schema }))

    const response = await handler({}, mockContext())
    expect(response.statusCode).toEqual(200)
    expect(response.body).toEqual('Hello world')
  })

  it('誤ったレスポンスオブジェクトの場合、BadRequestとなること', async () => {
    const schema = v.object({
      body: v.object({}),
      statusCode: v.number(),
    })

    const handler = middy().handler(() => ({}) as v.InferOutput<typeof schema>)

    handler.use(validatorMiddleware({ responseSchema: schema }))

    await expect(() => handler({}, mockContext())).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 400,
        message: 'Response object failed validation',
        cause: {
          package: '@gahojin-inc/middy-valibot-validator',
          data: [
            expect.objectContaining({
              message: 'Invalid key: Expected "body" but received undefined',
              path: [expect.objectContaining({ key: 'body' })],
              type: 'object',
            }),
            expect.objectContaining({
              message: 'Invalid key: Expected "statusCode" but received undefined',
              path: [expect.objectContaining({ key: 'statusCode' })],
              type: 'object',
            }),
          ],
        },
      }),
    )
  })

  it('誤ったメールフォーマットは許可されないこと', async () => {
    const schema = v.object({
      email: v.pipe(v.string(), v.email()),
    })

    const handler = middy()

    handler.use(validatorMiddleware({ eventSchema: schema }))

    await expect(() => handler({ email: 'abc@abc' }, mockContext())).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 400,
        message: 'Event object failed validation',
        cause: {
          package: '@gahojin-inc/middy-valibot-validator',
          data: [
            expect.objectContaining({
              message: 'Invalid email: Received "abc@abc"',
              path: [expect.objectContaining({ key: 'email' })],
              type: 'email',
            }),
          ],
        },
      }),
    )
  })

  it('配列のバリデーションが動作すること', async () => {
    const schema = v.union([v.object({ test: v.string() }), v.array(v.object({ test: v.string() }))])

    const handler = middy()

    handler.use(validatorMiddleware({ eventSchema: schema }))

    await handler({ test: 'test' }, mockContext())
    await handler([{ test: 'test' }, { test: 'test2' }, { test: 'test3' }], mockContext())
  })
})
