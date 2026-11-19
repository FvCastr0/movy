import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: 'O nome deve ser uma string.' })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'O telefone deve ser uma string.' })
  phone?: string;

  @IsOptional()
  @MinLength(6, { message: 'A senha deve conter no mínimo 6 caracteres.' })
  password?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Papel inválido. Deve ser ADMIN, SDR, CLOSER ou GESTOR.' })
  role?: UserRole;
}
