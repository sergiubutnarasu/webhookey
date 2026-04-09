export interface ICryptoService {
  generateSecret(): string
  verifyHmac(payload: Buffer, secret: string, signature: string): boolean
  generateDeviceCode(): string
  generateUserCode(): string
}
