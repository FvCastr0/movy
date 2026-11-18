import { IsNotEmpty, IsString, IsOptional, IsDateString } from 'class-validator';

export class ImportRevenueCsvDto {
  @IsString({ message: 'O conteúdo CSV deve ser fornecido em formato texto.' })
  @IsNotEmpty({ message: 'O arquivo ou texto CSV não pode estar vazio.' })
  csvData: string;

  @IsOptional()
  @IsString()
  filename?: string;

  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @IsOptional()
  @IsDateString()
  periodEnd?: string;
}
