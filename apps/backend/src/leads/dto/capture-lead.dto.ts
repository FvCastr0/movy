import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CaptureLeadDto {
  @IsString({ message: 'O nome deve ser uma string válida.' })
  @IsNotEmpty({ message: 'O nome completo é obrigatório.' })
  @MaxLength(120, { message: 'O nome deve ter no máximo 120 caracteres.' })
  nome: string;

  @IsString({ message: 'O WhatsApp deve ser uma string válida.' })
  @IsNotEmpty({ message: 'O número de WhatsApp com DDD é obrigatório.' })
  @MaxLength(25, { message: 'O WhatsApp deve ter no máximo 25 caracteres.' })
  whatsapp: string;

  @IsString({ message: 'O nome do delivery deve ser uma string válida.' })
  @IsNotEmpty({ message: 'O nome do delivery é obrigatório.' })
  @MaxLength(120, { message: 'O nome do delivery deve ter no máximo 120 caracteres.' })
  deliveryNome: string;

  @IsString({ message: 'O segmento deve ser uma string válida.' })
  @IsNotEmpty({ message: 'O segmento de alimentação é obrigatório.' })
  segmento: string;

  @IsString({ message: 'A cidade deve ser uma string válida.' })
  @IsNotEmpty({ message: 'A cidade / estado é obrigatória.' })
  @MaxLength(100, { message: 'A cidade deve ter no máximo 100 caracteres.' })
  cidade: string;
}
