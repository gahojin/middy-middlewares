import type { BodyParser } from '../index'

const jsonParser: BodyParser = {
  contentType: /^application\/(.+\+)?json($|;.+)/,
  parse: (body) => JSON.parse(body),
  invalidMessage: 'Invalid or malformed JSON was provided',
}

export default jsonParser
