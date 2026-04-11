import { IsString, IsBoolean, IsInt, IsOptional, Min, Max, MaxLength, MinLength, IsBase64 } from 'class-validator'

export class CreateChannelDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  name!: string

  @IsOptional()
  @IsBoolean()
  generateSecret?: boolean

  @IsOptional()
  @IsString()
  @IsBase64()
  encryptedSecret?: string | null

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  retentionDays?: number | null
}

export class UpdateChannelDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  name?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  retentionDays?: number | null
}
