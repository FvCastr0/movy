import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QualificationEngine } from './qualification-engine';
import { UpdateQualificationDto } from './dto/update-qualification.dto';
import { CreateFollowUpDto } from './dto/create-followup.dto';

@Injectable()
export class QualificationService {
  private readonly logger = new Logger(QualificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async updateQualification(leadId: string, dto: UpdateQualificationDto) {
    const qualification = await this.prisma.leadQualification.findUnique({
      where: { leadId },
    });

    if (!qualification) {
      throw new NotFoundException(`Qualificação para o lead ${leadId} não foi encontrada.`);
    }

    // Merge das notas existentes com as novas
    const merged = {
      scorePerfil: dto.scorePerfil ?? qualification.scorePerfil,
      scoreCapacidadeOperacional: dto.scoreCapacidadeOperacional ?? qualification.scoreCapacidadeOperacional,
      scoreNecessidadeObjetivo: dto.scoreNecessidadeObjetivo ?? qualification.scoreNecessidadeObjetivo,
      scoreCapacidadeInvestir: dto.scoreCapacidadeInvestir ?? qualification.scoreCapacidadeInvestir,
      scoreAcessoDecisor: dto.scoreAcessoDecisor ?? qualification.scoreAcessoDecisor,
      scoreMomentoContratacao: dto.scoreMomentoContratacao ?? qualification.scoreMomentoContratacao,
    };

    // Calcular resultado via engine
    const result = QualificationEngine.evaluate(merged);

    this.logger.log(
      `Qualificação atualizada para lead ${leadId}: Total=${result.totalScore}, Prioridade=${result.priority}, Encaminhamento=${result.forwardingAction}`,
    );

    return this.prisma.leadQualification.update({
      where: { leadId },
      data: {
        scorePerfil: merged.scorePerfil,
        justificativaPerfil: dto.justificativaPerfil ?? qualification.justificativaPerfil,
        scoreCapacidadeOperacional: merged.scoreCapacidadeOperacional,
        justificativaOperacional: dto.justificativaOperacional ?? qualification.justificativaOperacional,
        scoreNecessidadeObjetivo: merged.scoreNecessidadeObjetivo,
        justificativaNecessidade: dto.justificativaNecessidade ?? qualification.justificativaNecessidade,
        scoreCapacidadeInvestir: merged.scoreCapacidadeInvestir,
        justificativaInvestir: dto.justificativaInvestir ?? qualification.justificativaInvestir,
        scoreAcessoDecisor: merged.scoreAcessoDecisor,
        justificativaDecisor: dto.justificativaDecisor ?? qualification.justificativaDecisor,
        scoreMomentoContratacao: merged.scoreMomentoContratacao,
        justificativaMomento: dto.justificativaMomento ?? qualification.justificativaMomento,
        totalScore: result.totalScore,
        priority: result.priority,
        meetingCondition: result.meetingCondition,
        forwardingAction: result.forwardingAction,
        pendenciasCloser: dto.pendenciasCloser ?? qualification.pendenciasCloser,
        proximaAcao: dto.proximaAcao ?? qualification.proximaAcao,
        dataProximoContato: dto.dataProximoContato ? new Date(dto.dataProximoContato) : qualification.dataProximoContato,
        motivoPerda: dto.motivoPerda ?? qualification.motivoPerda,
      },
    });
  }

  async getQualification(leadId: string) {
    const qualification = await this.prisma.leadQualification.findUnique({
      where: { leadId },
    });

    if (!qualification) {
      throw new NotFoundException(`Qualificação para o lead ${leadId} não foi encontrada.`);
    }

    const result = QualificationEngine.evaluate({
      scorePerfil: qualification.scorePerfil,
      scoreCapacidadeOperacional: qualification.scoreCapacidadeOperacional,
      scoreNecessidadeObjetivo: qualification.scoreNecessidadeObjetivo,
      scoreCapacidadeInvestir: qualification.scoreCapacidadeInvestir,
      scoreAcessoDecisor: qualification.scoreAcessoDecisor,
      scoreMomentoContratacao: qualification.scoreMomentoContratacao,
    });

    return {
      ...qualification,
      computedResult: result,
    };
  }

  async addFollowUp(leadId: string, userId: string, dto: CreateFollowUpDto) {
    // Verificar existência do lead
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException(`Lead ${leadId} não encontrado.`);
    }

    return this.prisma.leadFollowUp.create({
      data: {
        leadId,
        userId,
        notes: dto.notes,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });
  }

  async getFollowUps(leadId: string) {
    return this.prisma.leadFollowUp.findMany({
      where: { leadId },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
