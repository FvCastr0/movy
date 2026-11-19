import { IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateFollowUpDto {
  @IsOptional()
  @IsString({ message: 'As notas do follow-up devem ser uma string.' })
  notes?: string;

  @IsOptional()
  @IsString({ message: 'O conteúdo do follow-up deve ser uma string.' })
  content?: string;

  @IsOptional()
  @IsDateString({}, { message: 'scheduledAt deve ser uma data ISO válida.' })
  scheduledAt?: string;
}
