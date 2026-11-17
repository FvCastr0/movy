import { IsEnum, IsNumber, IsOptional, Min, Max, IsDateString, IsString } from 'class-validator';
import { PlanCycle, PlanType, PaymentStatus } from '@prisma/client';

export class CreateContractDto {
  @IsEnum(PlanCycle, { message: 'Ciclo do plano inválido (MENSAL ou TRIMESTRAL).' })
  cycle: PlanCycle;

  @IsEnum(PlanType, { message: 'Tipo de plano comercial inválido.' })
  planType: PlanType;

  @IsNumber({}, { message: 'O valor total do contrato deve ser numérico.' })
  @Min(0, { message: 'O valor do contrato não pode ser negativo.' })
  totalValue: number;

  @IsNumber({}, { message: 'O MRR equivalente deve ser numérico.' })
  @Min(0, { message: 'O MRR equivalente não pode ser negativo.' })
  mrrEquivalent: number;

  @IsOptional()
  @IsNumber({}, { message: 'A taxa de setup deve ser numérica.' })
  @Min(0)
  setupValue?: number;

  @IsNumber({}, { message: 'O dia de vencimento deve ser numérico.' })
  @Min(1, { message: 'O dia de vencimento mínimo é 1.' })
  @Max(31, { message: 'O dia de vencimento máximo é 31.' })
  dueDay: number;

  @IsOptional()
  @IsEnum(PaymentStatus, { message: 'Status de pagamento inválido.' })
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsNumber({}, { message: 'A verba de anúncios deve ser numérica.' })
  @Min(0)
  mediaBudget?: number;

  @IsOptional()
  @IsNumber({}, { message: 'O custo operacional (COGS) deve ser numérico.' })
  @Min(0)
  operationalCost?: number;

  @IsOptional()
  @IsDateString({}, { message: 'A data de início do contrato deve estar em formato ISO.' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'A data de encerramento do contrato deve estar em formato ISO.' })
  endDate?: string;

  @IsOptional()
  @IsString()
  churnReason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
