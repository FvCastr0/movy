import { IsNotEmpty, IsOptional, IsString, IsDateString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReportDto {
  @IsNotEmpty()
  @IsString()
  clientId: string;

  @IsNotEmpty()
  @IsDateString()
  weekStartDate: string;

  @IsNotEmpty()
  @IsDateString()
  weekEndDate: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  metaSpend?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  metaImpressions?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  metaClicks?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  metaConversas?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  metaCtr?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  metaCpc?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  metaCostPerChat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  faturamentoTotal?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pedidosTotais?: number;

  @IsOptional()
  @IsString()
  analiseGestor?: string;

  @IsOptional()
  @IsString()
  proximasAcoes?: string;
}
