import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SyncClientConciergeDto {
  @IsBoolean()
  enabled!: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(512)
  digitalMenuUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  wabaId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  phoneNumberId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(512)
  metaAccessToken?: string;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  webhookVerifyToken?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(150)
  ownerEmail?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  ownerName?: string;

  @IsString()
  @IsOptional()
  @MinLength(8)
  @MaxLength(100)
  ownerPassword?: string;
}
