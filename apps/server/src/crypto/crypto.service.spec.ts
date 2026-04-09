import { Test, TestingModule } from '@nestjs/testing'
import { CryptoService } from './crypto.service'
import { CRYPTO_SERVICE_TOKEN } from './crypto.tokens'
import { ICryptoService } from '@webhookey/crypto'

describe('CryptoService', () => {
  let service: ICryptoService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: CRYPTO_SERVICE_TOKEN,
          useClass: CryptoService,
        },
      ],
    }).compile()

    service = module.get<ICryptoService>(CRYPTO_SERVICE_TOKEN)
  })

  it('should generate secrets', () => {
    const secret = service.generateSecret()
    expect(secret).toBeTruthy()
    expect(secret.length).toBeGreaterThan(0)
  })

  it('should generate user codes in correct format', () => {
    const code = service.generateUserCode()
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/)
  })
})
