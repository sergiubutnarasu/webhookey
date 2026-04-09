import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

export * from './interfaces/crypto.interface'

const SECRET_LENGTH = 32
const DEVICE_CODE_LENGTH = 32
const USER_CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No ambiguous characters

export function generateSecret(): string {
  return randomBytes(SECRET_LENGTH).toString('base64url')
}

export function verifyHmac(
  payload: Buffer,
  secret: string,
  signature: string,
): boolean {
  const expected = createHmac('sha256', secret).update(payload).digest('hex')
  const expectedBuf = Buffer.from(`sha256=${expected}`)
  // Pad or truncate signatureBuf to expectedBuf.length so timingSafeEqual
  // never short-circuits on a length mismatch — avoids the 1-bit timing leak.
  const signatureBuf = Buffer.alloc(expectedBuf.length)
  Buffer.from(signature).copy(signatureBuf, 0, 0, expectedBuf.length)
  return timingSafeEqual(expectedBuf, signatureBuf)
}

export function generateDeviceCode(): string {
  return randomBytes(DEVICE_CODE_LENGTH).toString('base64url')
}

export function generateUserCode(): string {
  let code = ''
  const bytes = randomBytes(8)
  
  for (let i = 0; i < 8; i++) {
    code += USER_CODE_CHARSET[bytes[i] % USER_CODE_CHARSET.length]
  }
  
  return `${code.slice(0, 4)}-${code.slice(4, 8)}`
}
