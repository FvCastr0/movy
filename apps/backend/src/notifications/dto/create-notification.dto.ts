import { IsNotEmpty, IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
  @IsNotEmpty({ message: 'O ID do usuário destinatário é obrigatório.' })
  @IsString({ message: 'O ID do usuário deve ser uma string.' })
  userId: string;

  @IsNotEmpty({ message: 'O título da notificação é obrigatório.' })
  @IsString({ message: 'O título deve ser uma string.' })
  title: string;

  @IsNotEmpty({ message: 'A mensagem da notificação é obrigatória.' })
  @IsString({ message: 'A mensagem deve ser uma string.' })
  message: string;

  @IsOptional()
  @IsEnum(NotificationType, { message: 'Tipo de notificação inválido.' })
  type?: NotificationType;

  @IsOptional()
  @IsString({ message: 'O link deve ser uma string.' })
  link?: string;

  @IsOptional()
  metadata?: any;

  @IsOptional()
  @IsBoolean()
  sendWhatsApp?: boolean;
}
