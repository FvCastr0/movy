import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EvolutionService } from '../evolution/evolution.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CadenceMilestone, SendMeetingConfirmationDto } from './dto/send-meeting-confirmation.dto';
import { LeadStage, UserRole } from '@prisma/client';

@Injectable()
export class MeetingCadenceService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(MeetingCadenceService.name);
  private checkInterval: NodeJS.Timeout | null = null;
  private isChecking = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly evolutionService: EvolutionService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onApplicationBootstrap() {
    this.logger.log('Inicializando serviço de monitoramento de reuniões (Meeting Cadence)...');
    
    // Executa a primeira checagem 15 segundos após o boot da aplicação
    setTimeout(() => {
      this.evaluateUpcomingMeetings().catch((err) =>
        this.logger.error(`Erro na checagem inicial de reuniões: ${err.message}`),
      );
    }, 15000);

    // Agenda checagens periódicas a cada 5 minutos (300.000 ms)
    this.checkInterval = setInterval(() => {
      this.evaluateUpcomingMeetings().catch((err) =>
        this.logger.error(`Erro no ciclo periódico de checagem de reuniões: ${err.message}`),
      );
    }, 300000);
  }

  onApplicationShutdown() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Avalia todos os leads agendados e verifica se atingiram os marcos de 24h, 12h ou 1h.
   */
  async evaluateUpcomingMeetings(): Promise<{ processed: number; alerted: number }> {
    if (this.isChecking) {
      this.logger.debug('Ciclo de checagem anterior ainda em andamento. Ignorando.');
      return { processed: 0, alerted: 0 };
    }

    this.isChecking = true;
    let alertedCount = 0;

    try {
      const now = new Date();
      // Busca reuniões agendadas que ainda não aconteceram ou que estão na janela futura de até 30 horas
      const futureLimit = new Date(now.getTime() + 30 * 3600000);

      const leads = await this.prisma.lead.findMany({
        where: {
          stage: LeadStage.REUNIAO_AGENDADA,
          meetingDate: {
            gte: new Date(now.getTime() - 2 * 3600000), // tolera até 2h após o início
            lte: futureLimit,
          },
        },
        include: {
          closerResponsible: { select: { id: true, name: true, phone: true } },
          sdrResponsible: { select: { id: true, name: true, phone: true } },
        },
      });

      for (const lead of leads) {
        if (!lead.meetingDate) continue;

        const meetingTime = new Date(lead.meetingDate).getTime();
        const diffMs = meetingTime - now.getTime();
        const diffHours = diffMs / 3600000;

        // Marco 1: Entre 20h e 25h antes da reunião (Alerta de 24 horas)
        if (diffHours <= 25 && diffHours >= 20 && !lead.meetingReminder24hSent) {
          await this.dispatchReminderToTeam(lead, '24H');
          await this.prisma.lead.update({
            where: { id: lead.id },
            data: { meetingReminder24hSent: true },
          });
          alertedCount++;
        }
        // Marco 2: Entre 8h e 13h antes da reunião (Alerta de 12 horas)
        else if (diffHours <= 13 && diffHours >= 8 && !lead.meetingReminder12hSent) {
          await this.dispatchReminderToTeam(lead, '12H');
          await this.prisma.lead.update({
            where: { id: lead.id },
            data: { meetingReminder12hSent: true },
          });
          alertedCount++;
        }
        // Marco 3: Entre 0.05h (3 min) e 1.25h (75 min) antes da reunião (Alerta de 1 hora)
        else if (diffHours <= 1.25 && diffHours >= 0.05 && !lead.meetingReminder1hSent) {
          await this.dispatchReminderToTeam(lead, '1H');
          await this.prisma.lead.update({
            where: { id: lead.id },
            data: { meetingReminder1hSent: true },
          });
          alertedCount++;
        }
      }

      return { processed: leads.length, alerted: alertedCount };
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Dispara a notificação para a equipe (Closer, ou SDR + Admins caso não haja closer)
   */
  private async dispatchReminderToTeam(lead: any, milestone: '24H' | '12H' | '1H') {
    const formattedDate = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Sao_Paulo',
    }).format(new Date(lead.meetingDate));

    let milestoneLabel = '24 horas';
    let urgencyPrefix = '📅 Confirmação de 24h';
    if (milestone === '12H') {
      milestoneLabel = '12 horas';
      urgencyPrefix = '⚡ Check-in de 12h';
    } else if (milestone === '1H') {
      milestoneLabel = '1 hora';
      urgencyPrefix = '🚨 Atenção: Reunião em 1h';
    }

    const title = `${urgencyPrefix} — ${lead.deliveryNome || lead.nome}`;
    const message = `A reunião com ${lead.nome} (${lead.deliveryNome}) está marcada para ${formattedDate}. Envie a confirmação de ${milestoneLabel} para garantir o show-rate!`;
    const link = `/crm/${lead.id}`;

    // Destinatários:
    // Se houver closerResponsible, envia para ele.
    // Se NÃO houver closer, envia para o SDR responsável E para todos os Administradores da MOVY.
    const recipientUserIds: string[] = [];

    if (lead.closerResponsibleId) {
      recipientUserIds.push(lead.closerResponsibleId);
    } else {
      if (lead.sdrResponsibleId) {
        recipientUserIds.push(lead.sdrResponsibleId);
      }
      // Busca todos os administradores
      const admins = await this.prisma.user.findMany({
        where: { role: UserRole.ADMIN },
        select: { id: true },
      });
      admins.forEach((admin) => {
        if (!recipientUserIds.includes(admin.id)) {
          recipientUserIds.push(admin.id);
        }
      });
    }

    this.logger.log(
      `Disparando alerta de reunião (${milestone}) do lead "${lead.deliveryNome}" para ${recipientUserIds.length} membro(s) da equipe`,
    );

    for (const userId of recipientUserIds) {
      this.notificationsService
        .create({
          userId,
          title,
          message,
          type: 'MEETING_REMINDER',
          link,
          metadata: { leadId: lead.id, milestone },
          sendWhatsApp: true,
        })
        .catch((err) => {
          this.logger.warn(`Falha ao disparar notificação de reunião para usuário ${userId}: ${err.message}`);
        });
    }
  }

  /**
   * Gera o texto padrão dinâmico de confirmação para o lead de acordo com o marco.
   */
  generateCadenceMessage(lead: any, milestone: CadenceMilestone, closerName?: string): string {
    const leadFirstName = lead.nome ? lead.nome.split(' ')[0] : 'Parceiro';
    const delivery = lead.deliveryNome || 'seu delivery';
    const cName = closerName || lead.closerResponsible?.name?.split(' ')[0] || 'da equipe MOVY';

    const d = new Date(lead.meetingDate);
    const timeFormatted = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    }).format(d);

    const dateFormatted = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'America/Sao_Paulo',
    }).format(d);

    const weekday = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      timeZone: 'America/Sao_Paulo',
    }).format(d);

    switch (milestone) {
      case CadenceMilestone.H24:
        return [
          `Olá, *${leadFirstName}*! Tudo bem?`,
          '',
          `Aqui é o *${cName}* da assessoria *MOVY*. Passando para confirmar nossa apresentação estratégica para o *${delivery}*, agendada para amanhã (${weekday}, ${dateFormatted} às ${timeFormatted}).`,
          '',
          `Conseguimos manter esse horário ou prefere algum ajuste?`,
        ].join('\n');

      case CadenceMilestone.H12:
        return [
          `Bom dia, *${leadFirstName}*!`,
          '',
          `Passando para alinhar nossa reunião hoje às *${timeFormatted}*. Já estou com a estrutura do *${delivery}* pronta para desenharmos nosso plano de escala juntos.`,
          '',
          `Nos falamos mais tarde!`,
        ].join('\n');

      case CadenceMilestone.H1:
      default:
        return [
          `Oi, *${leadFirstName}*!`,
          '',
          `Nossa reunião de apresentação começa em *1 hora* (às *${timeFormatted}*)!`,
          '',
          `Em instantes te envio o link de acesso à sala por aqui. Nos vemos já já!`,
        ].join('\n');
    }
  }

  /**
   * Envia a confirmação para o WhatsApp do cliente/lead e atualiza as flags no banco.
   */
  async sendConfirmationToLead(leadId: string, dto: SendMeetingConfirmationDto, senderUser?: any) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        closerResponsible: { select: { id: true, name: true, phone: true } },
        sdrResponsible: { select: { id: true, name: true, phone: true } },
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead não encontrado.');
    }

    const messageToSend =
      dto.customMessage?.trim() ||
      this.generateCadenceMessage(lead, dto.milestone, senderUser?.name);

    let evolutionResult: { success: boolean; error?: string } = { success: true };

    if (dto.sendViaBot) {
      if (!lead.whatsapp) {
        throw new NotFoundException('Este lead não possui número de WhatsApp cadastrado.');
      }
      evolutionResult = await this.evolutionService.sendCustomTextMessage(
        lead.whatsapp,
        messageToSend,
      );
    }

    // Atualiza status do marco correspondente no banco
    const updateData: any = {};
    if (dto.milestone === CadenceMilestone.H24) updateData.meetingReminder24hSent = true;
    if (dto.milestone === CadenceMilestone.H12) updateData.meetingReminder12hSent = true;
    if (dto.milestone === CadenceMilestone.H1) updateData.meetingReminder1hSent = true;
    if (dto.markAsConfirmed) updateData.meetingConfirmedByLead = true;

    const updatedLead = await this.prisma.lead.update({
      where: { id: leadId },
      data: updateData,
    });

    return {
      success: evolutionResult.success,
      error: evolutionResult.error,
      sentViaBot: dto.sendViaBot,
      message: messageToSend,
      updatedLead,
    };
  }
}
