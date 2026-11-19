import { IsNotEmpty, IsEmail, IsString, MinLength, IsEnum } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  @IsString({ message: 'O nome deve ser uma string.' })
  name: string;

  @IsNotEmpty({ message: 'O e-mail é obrigatório.' })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;

  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  @MinLength(6, { message: 'A senha deve conter no mínimo 6 caracteres.' })
  password: string;

  @IsNotEmpty({ message: 'O papel do usuário é obrigatório.' })
  @IsEnum(UserRole, { message: 'Papel inválido. Deve ser ADMIN, SDR, CLOSER ou GESTOR.' })
  role: UserRole;
}
