import { IsNotEmpty, IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';

export enum CadenceMilestone {
  H24 = '24H',
  H12 = '12H',
  H1 = '1H',
}

export class SendMeetingConfirmationDto {
  @IsNotEmpty({ message: 'O marco da reunião é obrigatório (24H, 12H ou 1H).' })
  @IsEnum(CadenceMilestone, { message: 'Marco inválido. Escolha 24H, 12H ou 1H.' })
  milestone: CadenceMilestone;

  @IsOptional()
  @IsString({ message: 'A mensagem personalizada deve ser uma string.' })
  customMessage?: string;

  @IsOptional()
  @IsBoolean()
  sendViaBot?: boolean = true;

  @IsOptional()
  @IsBoolean()
  markAsConfirmed?: boolean = false;
}
