import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'
const SALT_LENGTH = 32

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm'
  private readonly masterKey: string

  constructor(private readonly config: ConfigService) {
    this.masterKey = this.config.getOrThrow<string>('MASTER_KEY')
  }

  private deriveKey(salt: Buffer): Buffer {
    return scryptSync(this.masterKey, salt, 32)
  }

  encrypt(plaintext: string): string {
    const salt = randomBytes(SALT_LENGTH)
    const key = this.deriveKey(salt)
    const iv = randomBytes(16)
    const cipher = createCipheriv(this.algorithm, key, iv)

    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag()

    return `v2:${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
  }

  decrypt(ciphertext: string): string {
    const parts = ciphertext.split(':')

    if (parts[0] !== 'v2') {
      throw new Error('Unsupported ciphertext format. Run the encryption migration first.')
    }

    // v2 format: v2:salt:iv:authTag:ciphertext
    const [, saltHex, ivHex, authTagHex, encryptedHex] = parts
    const salt = Buffer.from(saltHex, 'hex')
    const key = this.deriveKey(salt)
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')

    const decipher = createDecipheriv(this.algorithm, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }
}
