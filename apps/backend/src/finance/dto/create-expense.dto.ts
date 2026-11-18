import { IsEnum, IsNumber, IsString, IsBoolean, IsOptional, IsDateString, Min } from 'class-validator';
import { ExpenseCategory } from '@prisma/client';

export class CreateExpenseDto {
  @IsString()
  description: string;

  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsDateString()
  dueDate: string;

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
