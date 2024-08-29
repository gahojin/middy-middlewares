import httpSignatureMiddleware from '@/index'
import { calcMessageMAC } from '@/mac'
import middy from '@middy/core'
import mockContext from 'aws-lambda-mock-context'

describe('httpSignature', () => {
  it('リクエストの署名が一致した時、エラーが起きないこと', async () => {
    const body = 'Middy Response data'
    const mac = calcMessageMAC('sha256', 'secret key', body)

    const handler = middy().use(
      httpSignatureMiddleware({
        input: {
          algorithm: 'sha256',
          key: 'secret key',
          headerName: 'signature',
        },
      }),
    )
    await handler(
      {
        headers: { signature: mac },
        body,
      },
      mockContext(),
    )
  })

  it('リクエストの署名が不一致の場合、エラーとなること', async () => {
    const body = 'Middy Response data'
    const mac = calcMessageMAC('sha256', 'bad key', body)

    const handler = middy().use(
      httpSignatureMiddleware({
        input: {
          algorithm: 'sha256',
          key: 'secret key',
          headerName: 'signature',
        },
      }),
    )

    await expect(() =>
      handler(
        {
          headers: { signature: mac },
          body,
        },
        mockContext(),
      ),
    ).rejects.toThrowError(
      expect.objectContaining({
        statusCode: 400,
        message: 'Bad signature',
        cause: {
          package: '@gahojin-inc/middy-http-signature',
        },
      }),
    )
  })

  it('レスポンスに署名されること', async () => {
    const body = 'Middy Response data'
    const mac = calcMessageMAC('sha256', 'secret key', body)

    const handler = middy(() => {
      return {
        body,
        statusCode: 200,
      }
    }).use(
      httpSignatureMiddleware({
        output: {
          algorithm: 'sha256',
          key: 'secret key',
          headerName: 'signature',
        },
      }),
    )
    const response = await handler({}, mockContext())
    expect(response).toEqual({
      statusCode: 200,
      body,
      headers: { signature: mac },
    })
  })

  it('レスポンスが文字列ではない場合、何も行わない', async () => {
    const handler = middy(() => {
      return {
        body: { dummy: 'dummy' },
        statusCode: 200,
      }
    }).use(
      httpSignatureMiddleware({
        output: {
          algorithm: 'sha256',
          key: 'secret key',
          headerName: 'signature',
        },
      }),
    )
    const response = await handler({}, mockContext())
    expect(response).toEqual({
      statusCode: 200,
      body: { dummy: 'dummy' },
      headers: {},
    })
  })
})