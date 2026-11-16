import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LeadStage } from '@prisma/client';

export class UpdateLeadDto {
  @IsOptional()
  @IsEnum(LeadStage, { message: 'stage inválido.' })
  stage?: LeadStage;

  @IsOptional()
  @IsString()
  instagramCardapio?: string;

  @IsOptional()
  faturamentoMensal?: number;

  @IsOptional()
  pedidosMensais?: number;

  @IsOptional()
  ticketMedio?: number;

  @IsOptional()
  midiaAtualMensal?: number;

  @IsOptional()
  @IsString()
  canalEntrada?: string;

  @IsOptional()
  @IsString()
  decisoresCargos?: string;

  @IsOptional()
  @IsString()
  prazoDesejadoInicio?: string;

  @IsOptional()
  @IsString()
  problemaPrincipal?: string;

  @IsOptional()
  @IsString()
  metaCliente?: string;

  @IsOptional()
  @IsString()
  historicoAgencias?: string;

  @IsOptional()
  @IsString()
  recursosDeclarados?: string;

  @IsOptional()
  @IsString()
  sdrResponsibleId?: string;
}
