import { IsNotEmpty, IsString, MaxLength, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateOutboundLeadDto {
  @IsString({ message: 'O nome do contato deve ser um texto válido.' })
  @IsNotEmpty({ message: 'O nome do contato é obrigatório.' })
  @MaxLength(120, { message: 'O nome deve ter no máximo 120 caracteres.' })
  nome: string;

  @IsString({ message: 'O número de WhatsApp deve ser um texto válido.' })
  @IsNotEmpty({ message: 'O WhatsApp de contato é obrigatório.' })
  @MaxLength(25, { message: 'O WhatsApp deve ter no máximo 25 caracteres.' })
  whatsapp: string;

  @IsString({ message: 'O nome do restaurante/delivery deve ser um texto válido.' })
  @IsNotEmpty({ message: 'O nome do delivery é obrigatório.' })
  @MaxLength(120, { message: 'O nome do delivery deve ter no máximo 120 caracteres.' })
  deliveryNome: string;

  @IsString({ message: 'O segmento deve ser um texto válido.' })
  @IsNotEmpty({ message: 'O segmento de atuação (ex: Hamburgueria, Pizzaria) é obrigatório.' })
  segmento: string;

  @IsString({ message: 'A cidade/UF deve ser um texto válido.' })
  @IsNotEmpty({ message: 'A cidade é obrigatória.' })
  @MaxLength(100, { message: 'A cidade deve ter no máximo 100 caracteres.' })
  cidade: string;

  @IsOptional()
  @IsString({ message: 'O link ou perfil do Instagram/Cardápio deve ser um texto válido.' })
  instagramCardapio?: string;

  @IsOptional()
  @IsNumber({}, { message: 'O valor estimado da oportunidade deve ser numérico.' })
  @Min(0, { message: 'O valor da proposta não pode ser negativo.' })
  dealValue?: number;

  @IsOptional()
  @IsString({ message: 'O contexto ou dor do restaurante deve ser um texto válido.' })
  problemaPrincipal?: string;
}
