import { IsString, MinLength, MaxLength } from 'class-validator'

/**
 * DTO for updating user password
 * Single Responsibility: only handles password updates with verification
 * Security: requires current password to prevent unauthorized changes
 */
export class UpdatePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string
}
