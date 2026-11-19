import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber, IsDateString, ValidateIf, Min } from 'class-validator';
import { LeadStage } from '@prisma/client';

export class UpdateCrmStageDto {
  @IsEnum(LeadStage, { message: 'Estágio do funil comercial inválido.' })
  stage: LeadStage;

  @ValidateIf((o) => o.stage === LeadStage.PERDIDO)
  @IsString({ message: 'O motivo de perda deve ser um texto válido.' })
  @IsNotEmpty({ message: 'O motivo de perda é obrigatório ao marcar o lead como PERDIDO.' })
  lostReason?: string;

  @ValidateIf((o) => o.stage === LeadStage.REUNIAO_AGENDADA)
  @IsDateString({}, { message: 'A data e horário da reunião devem estar em formato ISO válido (ex: 2026-11-20T14:30:00Z).' })
  @IsNotEmpty({ message: 'A data e horário da reunião são obrigatórios para agendamentos.' })
  meetingDate?: string;

  @IsOptional()
  @IsNumber({}, { message: 'O valor da oportunidade deve ser numérico.' })
  @Min(0, { message: 'O valor da proposta não pode ser negativo.' })
  dealValue?: number;

  @IsOptional()
  @IsString({ message: 'O ID do Closer responsável deve ser uma string válida.' })
  closerResponsibleId?: string;
}
