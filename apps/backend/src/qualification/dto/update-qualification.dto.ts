import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateQualificationDto {
  @IsOptional()
  @IsInt({ message: 'scorePerfil deve ser um inteiro.' })
  @Min(0, { message: 'Nota mínima: 0.' })
  @Max(3, { message: 'Nota máxima: 3.' })
  @Type(() => Number)
  scorePerfil?: number;

  @IsOptional()
  @IsString()
  justificativaPerfil?: string;

  @IsOptional()
  @IsInt({ message: 'scoreCapacidadeOperacional deve ser um inteiro.' })
  @Min(0)
  @Max(3)
  @Type(() => Number)
  scoreCapacidadeOperacional?: number;

  @IsOptional()
  @IsString()
  justificativaOperacional?: string;

  @IsOptional()
  @IsInt({ message: 'scoreNecessidadeObjetivo deve ser um inteiro.' })
  @Min(0)
  @Max(3)
  @Type(() => Number)
  scoreNecessidadeObjetivo?: number;

  @IsOptional()
  @IsString()
  justificativaNecessidade?: string;

  @IsOptional()
  @IsInt({ message: 'scoreCapacidadeInvestir deve ser um inteiro.' })
  @Min(0)
  @Max(3)
  @Type(() => Number)
  scoreCapacidadeInvestir?: number;

  @IsOptional()
  @IsString()
  justificativaInvestir?: string;

  @IsOptional()
  @IsInt({ message: 'scoreAcessoDecisor deve ser um inteiro.' })
  @Min(0)
  @Max(3)
  @Type(() => Number)
  scoreAcessoDecisor?: number;

  @IsOptional()
  @IsString()
  justificativaDecisor?: string;

  @IsOptional()
  @IsInt({ message: 'scoreMomentoContratacao deve ser um inteiro.' })
  @Min(0)
  @Max(3)
  @Type(() => Number)
  scoreMomentoContratacao?: number;

  @IsOptional()
  @IsString()
  justificativaMomento?: string;

  @IsOptional()
  @IsString()
  pendenciasCloser?: string;

  @IsOptional()
  @IsString()
  proximaAcao?: string;

  @IsOptional()
  @IsString()
  dataProximoContato?: string;

  @IsOptional()
  @IsString()
  motivoPerda?: string;
}
