import { IsString, MinLength, MaxLength } from 'class-validator'

/**
 * DTO for updating user profile information
 * Single Responsibility: only handles profile updates (name)
 */
export class UpdateProfileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  name!: string
}
