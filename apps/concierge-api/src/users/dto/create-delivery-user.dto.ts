import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { DeliveryUserRole } from '@prisma/client';

export class CreateDeliveryUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(150)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(100)
  password!: string;

  @IsEnum(DeliveryUserRole)
  @IsOptional()
  role?: DeliveryUserRole;
}

export class UpdateDeliveryUserStatusDto {
  @IsBoolean()
  isActive!: boolean;
}
