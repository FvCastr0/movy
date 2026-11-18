import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LeadOriginType } from '@prisma/client';

export class CrmMetricsQueryDto {
  @IsOptional()
  @IsEnum(LeadOriginType, { message: 'origemTipo deve ser INBOUND ou OUTBOUND.' })
  origemTipo?: LeadOriginType;

  @IsOptional()
  @IsString({ message: 'startDate deve ser uma data válida.' })
  startDate?: string;

  @IsOptional()
  @IsString({ message: 'endDate deve ser uma data válida.' })
  endDate?: string;
}
