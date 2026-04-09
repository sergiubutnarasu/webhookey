import { describe, it, expect } from 'vitest'
import {
  generateSecret,
  verifyHmac,
  generateDeviceCode,
  generateUserCode,
} from './index'
import { createHmac } from 'crypto'

describe('crypto', () => {
  describe('generateSecret', () => {
    it('should generate URL-safe base64 string', () => {
      const secret = generateSecret()
      expect(secret).toMatch(/^[A-Za-z0-9_-]+$/)
    })

    it('should generate different values each call', () => {
      const s1 = generateSecret()
      const s2 = generateSecret()
      expect(s1).not.toBe(s2)
    })
  })

  describe('verifyHmac', () => {
    it('should return true for valid signature', () => {
      const secret = 'my-secret'
      const payload = Buffer.from('test payload')
      const expected = createHmac('sha256', secret).update(payload).digest('hex')
      const valid = verifyHmac(payload, secret, `sha256=${expected}`)
      expect(valid).toBe(true)
    })

    it('should return false for tampered payload', () => {
      const secret = 'my-secret'
      const payload = Buffer.from('test payload')
      const expected = createHmac('sha256', secret).update(payload).digest('hex')
      const tampered = Buffer.from('tampered payload')
      const valid = verifyHmac(tampered, secret, `sha256=${expected}`)
      expect(valid).toBe(false)
    })

    it('should return false for wrong secret', () => {
      const secret = 'my-secret'
      const payload = Buffer.from('test payload')
      const expected = createHmac('sha256', secret).update(payload).digest('hex')
      const valid = verifyHmac(payload, 'wrong-secret', `sha256=${expected}`)
      expect(valid).toBe(false)
    })
  })

  describe('generateUserCode', () => {
    it('should format as XXXX-XXXX', () => {
      const code = generateUserCode()
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/)
    })

    it('should not contain ambiguous characters', () => {
      const code = generateUserCode()
      expect(code).not.toContain('I')
      expect(code).not.toContain('O')
      expect(code).not.toContain('0')
      expect(code).not.toContain('1')
    })
  })

  describe('generateDeviceCode', () => {
    it('should generate URL-safe string', () => {
      const code = generateDeviceCode()
      expect(code).toMatch(/^[A-Za-z0-9_-]+$/)
    })
  })
})
