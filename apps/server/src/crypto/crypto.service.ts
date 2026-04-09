import { Injectable } from '@nestjs/common'
import { ICryptoService } from '@webhookey/crypto'
import {
  generateSecret,
  verifyHmac,
  generateDeviceCode,
  generateUserCode,
} from '@webhookey/crypto'

@Injectable()
export class CryptoService implements ICryptoService {
  generateSecret(): string {
    return generateSecret()
  }

  verifyHmac(payload: Buffer, secret: string, signature: string): boolean {
    return verifyHmac(payload, secret, signature)
  }

  generateDeviceCode(): string {
    return generateDeviceCode()
  }

  generateUserCode(): string {
    return generateUserCode()
  }
}
