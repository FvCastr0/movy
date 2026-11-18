import { IsNotEmpty, IsOptional, IsString, IsDateString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AutoGenerateReportDto {
  @IsNotEmpty({ message: 'A data inicial da semana é obrigatória.' })
  @IsDateString({}, { message: 'Data inicial inválida (formato ISO).' })
  weekStartDate: string;

  @IsNotEmpty({ message: 'A data final da semana é obrigatória.' })
  @IsDateString({}, { message: 'Data final inválida (formato ISO).' })
  weekEndDate: string;

  @IsOptional()
  @IsString()
  analiseGestor?: string;

  @IsOptional()
  @IsString()
  proximasAcoes?: string;

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
}
