import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { EncryptionService } from './encryption.service'

describe('EncryptionService', () => {
  let service: EncryptionService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('test-master-key-32-characters-long'),
          },
        },
      ],
    }).compile()

    service = module.get<EncryptionService>(EncryptionService)
  })

  it('should encrypt and decrypt successfully', () => {
    const plaintext = 'my-secret-value'
    const encrypted = service.encrypt(plaintext)
    const decrypted = service.decrypt(encrypted)
    
    expect(decrypted).toBe(plaintext)
  })

  it('should produce different ciphertext each time', () => {
    const plaintext = 'my-secret-value'
    const encrypted1 = service.encrypt(plaintext)
    const encrypted2 = service.encrypt(plaintext)
    
    expect(encrypted1).not.toBe(encrypted2)
  })
})
