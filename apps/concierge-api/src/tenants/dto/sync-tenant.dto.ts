import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsSafePublicHttpsUrl } from '../../common/validators/security.validators';

export class SyncTenantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  movyClientId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  segment!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  whatsappPhone!: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

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

  @IsOptional()
  @IsSafePublicHttpsUrl()
  digitalMenuUrl?: string;

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
