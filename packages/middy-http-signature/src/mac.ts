import crypto from 'node:crypto'

/**
 * MAC値を算出する
 * @param algorithm HMAC値算出アルゴリズム
 * @param key キー
 * @param body リクエスト/レスポンスメッセージ
 * @returns MAC値
 */
const calcMessageMAC = (algorithm: string, key: crypto.BinaryLike | crypto.KeyObject, body: string): string | null => {
  const hmac = crypto.createHmac(algorithm, key)
  hmac.update(body)
  return hmac.digest('base64')
}

export { calcMessageMAC }
