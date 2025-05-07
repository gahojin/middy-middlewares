import querystring from 'node:querystring'
import type { BodyParser } from '../index'

const invalidMessage = 'Invalid or malformed URL encoded form was provided'
const urlencodeParser: BodyParser = {
  contentType: /^application\/x-www-form-urlencoded(;.*)?$/,
  parse: (body) => {
    const ret = Object.assign({}, querystring.parse(body))
    if (ret?.[body] === '') {
      throw new Error(invalidMessage)
    }
    return ret
  },
  invalidMessage,
}

export default urlencodeParser
