import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentStatus } from '@prisma/client';

export class UpdatePaymentStatusDto {
  @IsEnum(PaymentStatus, { message: 'Status de pagamento inválido (EM_DIA, PENDENTE ou INADIMPLENTE).' })
  paymentStatus: PaymentStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
