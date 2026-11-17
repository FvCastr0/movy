import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { LeadStage } from '@prisma/client';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(private readonly prisma: PrismaService) { }

  async findAll() {
    return this.prisma.client.findMany({
      include: {
        accountManager: {
          select: { id: true, name: true, email: true },
        },
        convertedLead: {
          select: { id: true, faturamentoMensal: true, ticketMedio: true },
        },
        weeklyReports: {
          take: 1,
          orderBy: { weekEndDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        accountManager: {
          select: { id: true, name: true, email: true },
        },
        convertedLead: {
          include: {
            qualification: true,
          },
        },
        weeklyReports: {
          orderBy: { weekEndDate: 'desc' },
        },
      },
    });

    if (!client) {
      throw new NotFoundException(`Cliente com ID ${id} não encontrado.`);
    }

    return client;
  }

  async create(dto: CreateClientDto) {
    return this.prisma.client.create({
      data: dto,
    });
  }

  async update(id: string, dto: UpdateClientDto) {
    await this.findOne(id);
    return this.prisma.client.update({
      where: { id },
      data: dto,
    });
  }

  async convertLeadToClient(leadId: string, dto?: ConvertLeadDto) {
    this.logger.log(`Iniciando conversão do lead ${leadId} em Cliente...`);

    return this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findUnique({
        where: { id: leadId },
        include: { client: true },
      });

      if (!lead) {
        throw new NotFoundException(
          `Lead com ID ${leadId} não encontrado.`,
        );
      }

      if (lead.client) {
        throw new BadRequestException(
          `Este lead já foi convertido no cliente ID: ${lead.client.id}`,
        );
      }

      const isTrimestral = !lead.dealValue || lead.dealValue === 4500 || lead.dealValue >= 3000;
      const totalContractValue = lead.dealValue || 4500.0;
      const mrrValue = isTrimestral ? (totalContractValue / 3) : totalContractValue;

      const client = await tx.client.create({
        data: {
          nome: lead.nome,
          deliveryNome: lead.deliveryNome,
          whatsapp: lead.whatsapp,
          segmento: lead.segmento,
          cidade: lead.cidade,
          convertedLeadId: lead.id,
          metaAdAccountId: dto?.metaAdAccountId || null,
          metaPixelId: dto?.metaPixelId || null,
          accountManagerId:
            dto?.accountManagerId || lead.sdrResponsibleId || null,
          contract: {
            create: {
              cycle: isTrimestral ? 'TRIMESTRAL' : 'MENSAL',
              planType: isTrimestral ? 'TRIMESTRAL_REUNIAO' : 'MENSAL_REUNIAO',
              totalValue: totalContractValue,
              mrrEquivalent: mrrValue,
              dueDay: 10,
              paymentStatus: 'EM_DIA',
              notes: 'Contrato gerado na conversão do lead comercial',
            },
          },
        },
      });

      await tx.lead.update({
        where: { id: leadId },
        data: {
          stage: LeadStage.FECHADO,
        },
      });

      this.logger.log(
        `Lead ${leadId} convertido com sucesso no Cliente ${client.id}`,
      );

      return client;
    });
  }
}
