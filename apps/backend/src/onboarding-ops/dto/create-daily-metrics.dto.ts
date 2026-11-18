import { IsDateString, IsNumber, Min, IsOptional } from 'class-validator';

export class CreateDailyMetricsDto {
  @IsDateString({}, { message: 'Data do snapshot inválida (formato ISO).' })
  date: string;

  @IsNumber({}, { message: 'O valor investido deve ser numérico.' })
  @Min(0)
  spend: number;

  @IsNumber({}, { message: 'O saldo da conta deve ser numérico.' })
  @Min(0)
  balance: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  impressions?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  clicks?: number;

  @IsNumber({}, { message: 'O número de conversas deve ser numérico.' })
  @Min(0)
  conversas: number;

  @IsNumber({}, { message: 'O CPA deve ser numérico.' })
  @Min(0)
  cpa: number;
}
