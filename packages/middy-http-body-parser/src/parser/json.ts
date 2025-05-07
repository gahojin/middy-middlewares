import type { BodyParser } from '../index'

const invalidMessage = 'Invalid or malformed JSON was provided'

const jsonParser: BodyParser = {
  contentType: /^application\/(.+\+)?json($|;.+)/,
  parse: (body) => {
    return JSON.parse(body)
  },
  invalidMessage,
  errorWhenUndefined: true,
}

export default jsonParser
