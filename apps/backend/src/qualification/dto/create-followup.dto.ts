import { IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateFollowUpDto {
  @IsString()
  @IsNotEmpty({ message: 'As notas do follow-up são obrigatórias.' })
  notes: string;

  @IsOptional()
  @IsDateString({}, { message: 'scheduledAt deve ser uma data ISO válida.' })
  scheduledAt?: string;
}
