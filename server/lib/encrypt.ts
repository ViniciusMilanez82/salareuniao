/**
 * Criptografia AES-256-GCM para API keys em produção.
 * Defina ENCRYPTION_KEY (string, ex: 32+ caracteres) no ambiente.
 * Se não definido, valores são armazenados em texto (retrocompat).
 */
import crypto from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LEN = 16
const AUTH_TAG_LEN = 16
const KEY_LEN = 32
const PREFIX = 'encv1:'

function getKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw || raw.length < 16) return null
  return crypto.scryptSync(raw, 'salareuniao-salt', KEY_LEN)
}

export function encrypt(plainText: string): string {
  const key = getKey()
  if (!key) return plainText

  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALGO, key, iv, { authTagLength: AUTH_TAG_LEN })
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  const combined = Buffer.concat([iv, authTag, encrypted])
  return PREFIX + combined.toString('base64')
}

export function decrypt(cipherText: string): string {
  if (!cipherText.startsWith(PREFIX)) return cipherText

  const key = getKey()
  if (!key) return cipherText

  try {
    const combined = Buffer.from(cipherText.slice(PREFIX.length), 'base64')
    const iv = combined.subarray(0, IV_LEN)
    const authTag = combined.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN)
    const encrypted = combined.subarray(IV_LEN + AUTH_TAG_LEN)
    const decipher = crypto.createDecipheriv(ALGO, key, iv, { authTagLength: AUTH_TAG_LEN })
    decipher.setAuthTag(authTag)
    return decipher.update(encrypted) + decipher.final('utf8')
  } catch {
    return cipherText
  }
}

export function isEncryptionConfigured(): boolean {
  return getKey() !== null
}
