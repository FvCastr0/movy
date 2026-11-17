import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ClientStatus } from '@prisma/client';

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  deliveryNome?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  segmento?: string;

  @IsOptional()
  @IsString()
  cidade?: string;

  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  @IsOptional()
  @IsString()
  metaAdAccountId?: string;

  @IsOptional()
  @IsString()
  metaPixelId?: string;

  @IsOptional()
  @IsString()
  accountManagerId?: string;
}
