import mockContext from '@gahojin-inc/aws-lambda-mock-context'
import middy from '@middy/core'
import parserMiddleware from './index'

const unexpectedTokenRegex = /^Unexpected token/

describe('parser(json)', () => {
  it('JSONリクエストをパース出来ること', async () => {
    const handler = middy((event: any) => event.body)

    handler.use(parserMiddleware())

    const event = {
      headers: {
        'Content-Type': 'application/json',
      },
      body: '{ "foo" :   "bar"   }',
    }

    const body = await handler(event, mockContext())
    expect(body).toEqual({ foo: 'bar' })
  })

  it('MediaTypeの接尾語がjsonの場合、JSONパースされること', async () => {
    const handler = middy((event: any) => event.body)

    handler.use(parserMiddleware())

    const event = {
      headers: {
        'Content-Type': 'application/vnd+json',
      },
      body: '{ "foo" :   "bar"   }',
    }

    const body = await handler(event, mockContext())
    expect(body).toEqual({ foo: 'bar' })
  })

  it('ヘッダーが小文字の場合、パース出来ること', async () => {
    const handler = middy((event: any) => event.body)

    handler.use(parserMiddleware())

    const event = {
      headers: {
        'content-type': 'application/json',
      },
      body: '{ "foo" :   "bar"   }',
    }

    const body = await handler(event, mockContext())
    expect(body).toEqual({ foo: 'bar' })
  })

  it('JSONではない場合、エラーが発生すること', async () => {
    const handler = middy((event: any) => event)

    handler.use(parserMiddleware())

    const event = {
      headers: {
        'content-type': 'application/json',
      },
      body: 'make it broken{ "foo" :   "bar"   }',
    }

    await expect(handler(event, mockContext())).rejects.toThrowError(
      expect.objectContaining({
        message: 'Invalid or malformed JSON was provided',
        status: 415,
        cause: expect.objectContaining({
          message: expect.stringMatching(unexpectedTokenRegex),
          package: '@gahojin-inc/middy-http-body-parser',
        }),
      }),
    )
  })

  it('undefinedの場合、エラーが発生すること', async () => {
    const handler = middy((event: any) => event.body)

    handler.use(parserMiddleware())

    const event = {
      headers: {
        'content-type': 'application/json',
      },
      body: undefined,
    }

    await expect(handler(event, mockContext())).rejects.toThrowError(
      expect.objectContaining({
        message: 'Invalid or malformed JSON was provided',
        status: 415,
        cause: {
          data: undefined,
          package: '@gahojin-inc/middy-http-body-parser',
        },
      }),
    )
  })

  it('ヘッダーが渡されない場合、処理されないこと (エラー処理無効)', async () => {
    const handler = middy((event: any) => event.body)

    handler.use(parserMiddleware({ disableContentTypeError: true }))

    const event = {
      headers: {},
      body: undefined,
    }

    const body = await handler(event, mockContext())
    expect(body).toBeUndefined()
  })

  it('base64エンコードされたjsonを処理出来ること', async () => {
    const handler = middy((event: any) => event.body)

    handler.use(parserMiddleware())

    const data = JSON.stringify({ foo: 'bar' })
    const base64Data = Buffer.from(data).toString('base64')
    const event = {
      headers: {
        'Content-Type': 'application/json',
      },
      isBase64Encoded: true,
      body: base64Data,
    }

    const body = await handler(event, mockContext())
    expect(body).toEqual({ foo: 'bar' })
  })

  it('base64エンコードされた壊れたjsonをエラー処理出来ること', async () => {
    const handler = middy((event: any) => event.body)

    handler.use(parserMiddleware())

    const data = `make it broken${JSON.stringify({ foo: 'bar' })}`
    const base64Data = Buffer.from(data).toString('base64')
    const event = {
      headers: {
        'Content-Type': 'application/json',
      },
      isBase64Encoded: true,
      body: base64Data,
    }

    await expect(handler(event, mockContext())).rejects.toThrowError(
      expect.objectContaining({
        message: 'Invalid or malformed JSON was provided',
        status: 415,
        cause: expect.objectContaining({
          message: expect.stringMatching(unexpectedTokenRegex),
          package: '@gahojin-inc/middy-http-body-parser',
        }),
      }),
    )
  })
})

describe('parser(urlencode)', () => {
  it('URLエンコードリクエストをパース出来ること', async () => {
    const handler = middy((event: any) => event.body)

    handler.use(parserMiddleware())

    const event = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: 'a[b][c][d]=i',
    }

    const body = await handler(event, mockContext())
    expect(body).toEqual({ 'a[b][c][d]': 'i' })
  })

  it('ヘッダーが小文字の場合、パース出来ること', async () => {
    const handler = middy((event: any) => event.body)

    handler.use(parserMiddleware())

    const event = {
      headers: {
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: 'a[b][c][d]=i',
    }

    const body = await handler(event, mockContext())
    expect(body).toEqual({ 'a[b][c][d]': 'i' })
  })

  it('undefinedの場合、エラーが発生すること', async () => {
    const handler = middy((event: any) => event.body)

    handler.use(parserMiddleware())

    const event = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: undefined,
    }

    await expect(handler(event, mockContext())).rejects.toThrowError(
      expect.objectContaining({
        message: 'Invalid or malformed URL encoded form was provided',
        status: 415,
        cause: {
          data: undefined,
          package: '@gahojin-inc/middy-http-body-parser',
        },
      }),
    )
  })

  it('ヘッダーが渡されない場合、処理されないこと (エラー処理無効)', async () => {
    const handler = middy((event: any) => event.body)

    handler.use(parserMiddleware({ disableContentTypeError: true }))

    const event = {
      headers: {},
      body: 'a[b][c][d]=i',
    }

    const body = await handler(event, mockContext())
    expect(body).toEqual('a[b][c][d]=i')
  })

  it('不正なbodyが渡された場合、エラー処理されること', async () => {
    const handler = middy((event: any) => event.body)

    handler.use(parserMiddleware({ disableContentTypeError: true }))

    const event = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: JSON.stringify({ foo: 'bar' }),
    }

    await expect(handler(event, mockContext())).rejects.toThrowError(
      expect.objectContaining({
        message: 'Invalid or malformed URL encoded form was provided',
        status: 415,
      }),
    )
  })

  it('base64エンコードされたURLエンコードを処理出来ること', async () => {
    const handler = middy((event: any) => event.body)

    handler.use(parserMiddleware())

    const event = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      isBase64Encoded: true,
      body: Buffer.from('a=a&b=b').toString('base64'),
    }

    const body = await handler(event, mockContext())
    expect(body).toEqual({ a: 'a', b: 'b' })
  })

  it('base64エンコードされた壊れたjsonをエラー処理出来ること', async () => {
    const handler = middy((event: any) => event.body)

    handler.use(parserMiddleware())

    const data = `make it broken${JSON.stringify({ foo: 'bar' })}`
    const base64Data = Buffer.from(data).toString('base64')
    const event = {
      headers: {
        'Content-Type': 'application/json',
      },
      isBase64Encoded: true,
      body: base64Data,
    }

    await expect(handler(event, mockContext())).rejects.toThrowError(
      expect.objectContaining({
        message: 'Invalid or malformed JSON was provided',
        status: 415,
        cause: expect.objectContaining({
          message: expect.stringMatching(unexpectedTokenRegex),
          package: '@gahojin-inc/middy-http-body-parser',
        }),
      }),
    )
  })
})
