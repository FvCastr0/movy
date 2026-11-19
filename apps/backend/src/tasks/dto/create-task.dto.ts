import { IsNotEmpty, IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { TaskPriority, TaskStatus } from '@prisma/client';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty({ message: 'O título da demanda é obrigatório.' })
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskPriority, { message: 'Prioridade inválida (BAIXA, MEDIA, ALTA, URGENTE).' })
  priority?: TaskPriority;

  @IsOptional()
  @IsEnum(TaskStatus, { message: 'Status inválido (PENDENTE, EM_ANDAMENTO, CONCLUIDA, CANCELADA).' })
  status?: TaskStatus;

  @IsOptional()
  @IsDateString({}, { message: 'A data limite (dueDate) deve estar no formato ISO válido.' })
  dueDate?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;
}
