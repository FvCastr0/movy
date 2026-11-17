import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ClientStatus } from '@prisma/client';

export class CreateClientDto {
  @IsString()
  nome: string;

  @IsString()
  deliveryNome: string;

  @IsString()
  whatsapp: string;

  @IsString()
  segmento: string;

  @IsString()
  cidade: string;

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
  convertedLeadId?: string;

  @IsOptional()
  @IsString()
  accountManagerId?: string;
}
