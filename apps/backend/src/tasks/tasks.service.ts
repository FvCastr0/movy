import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskQueryDto } from './dto/task-query.dto';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateTaskDto, userId: string, userRole: string) {
    // Regra de Negócio RBAC:
    // Apenas ADMIN pode delegar tarefas para outros membros da equipe.
    // Usuários com outros papéis (SDR, CLOSER, GESTOR) só podem criar demandas para si mesmos.
    const assignedToId =
      userRole === 'ADMIN' && dto.assignedToId
        ? dto.assignedToId
        : userId;

    this.logger.log(
      `Criando nova demanda "${dto.title}" criada por ${userId} atribuída para ${assignedToId}`,
    );

    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description || null,
        priority: dto.priority || 'MEDIA',
        status: dto.status || 'PENDENTE',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        createdById: userId,
        assignedToId,
        leadId: dto.leadId || null,
        clientId: dto.clientId || null,
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        lead: { select: { id: true, nome: true, deliveryNome: true } },
        client: { select: { id: true, nome: true, deliveryNome: true } },
      },
    });

    // Se a demanda foi delegada para outro usuário, dispara notificação in-app e WhatsApp
    if (assignedToId !== userId) {
      const creatorName = task.createdBy?.name || 'Administrador';
      const dueInfo = task.dueDate
        ? ` Prazo: ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(task.dueDate)}.`
        : '';

      this.notificationsService
        .create({
          userId: assignedToId,
          title: 'Nova Demanda Atribuída',
          message: `${creatorName} atribuiu a demanda "${task.title}" para você.${dueInfo}`,
          type: 'TASK_ASSIGNED',
          link: '/tasks',
          metadata: { taskId: task.id },
          sendWhatsApp: true,
        })
        .catch((err) => {
          this.logger.warn(`Falha ao registrar notificação de atribuição de demanda: ${err.message}`);
        });
    }

    return task;
  }

  async findAll(query: TaskQueryDto, userId: string, userRole: string) {
    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    // Controle de escopo de visualização
    if (query.scope === 'assigned_by_me') {
      where.createdById = userId;
    } else if (query.scope === 'my') {
      where.assignedToId = userId;
    } else if (query.scope === 'all') {
      if (userRole !== 'ADMIN') {
        // Usuário comum só enxerga tarefas onde é o criador ou o responsável
        where.OR = [{ assignedToId: userId }, { createdById: userId }];
      } else if (query.assignedToId) {
        where.assignedToId = query.assignedToId;
      }
    } else {
      // Default: se não especificado, mostra as atribuídas ao usuário logado
      where.assignedToId = userId;
    }

    return this.prisma.task.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        lead: { select: { id: true, nome: true, deliveryNome: true } },
        client: { select: { id: true, nome: true, deliveryNome: true } },
      },
      orderBy: [
        { status: 'asc' }, // PENDENTE e EM_ANDAMENTO primeiro
        { dueDate: 'asc' },  // Prazos mais próximos primeiro
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(id: string, userId: string, userRole: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        lead: { select: { id: true, nome: true, deliveryNome: true } },
        client: { select: { id: true, nome: true, deliveryNome: true } },
      },
    });

    if (!task) {
      throw new NotFoundException(`Demanda com ID ${id} não encontrada.`);
    }

    // Apenas Admin ou envolvidos (criador ou responsável) podem visualizar
    if (userRole !== 'ADMIN' && task.assignedToId !== userId && task.createdById !== userId) {
      throw new ForbiddenException('Você não tem permissão para acessar esta demanda.');
    }

    return task;
  }

  async update(id: string, dto: UpdateTaskDto, userId: string, userRole: string) {
    const task = await this.findOne(id, userId, userRole);

    // Se o usuário não for ADMIN e estiver tentando reatribuir para outro membro
    let assignedToId = task.assignedToId;
    if (dto.assignedToId) {
      if (userRole === 'ADMIN') {
        assignedToId = dto.assignedToId;
      } else if (dto.assignedToId !== userId) {
        throw new ForbiddenException('Apenas Administradores podem delegar demandas a outros membros.');
      }
    }

    return this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title ?? task.title,
        description: dto.description !== undefined ? dto.description : task.description,
        priority: dto.priority ?? task.priority,
        status: dto.status ?? task.status,
        dueDate: dto.dueDate !== undefined ? (dto.dueDate ? new Date(dto.dueDate) : null) : task.dueDate,
        assignedToId,
        leadId: dto.leadId !== undefined ? dto.leadId : task.leadId,
        clientId: dto.clientId !== undefined ? dto.clientId : task.clientId,
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        lead: { select: { id: true, nome: true, deliveryNome: true } },
        client: { select: { id: true, nome: true, deliveryNome: true } },
      },
    });
  }

  async delete(id: string, userId: string, userRole: string) {
    const task = await this.findOne(id, userId, userRole);

    // Apenas ADMIN ou o criador original podem excluir a demanda
    if (userRole !== 'ADMIN' && task.createdById !== userId) {
      throw new ForbiddenException('Apenas o criador da demanda ou Administradores podem excluí-la.');
    }

    return this.prisma.task.delete({
      where: { id },
    });
  }

  async getAssignableUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
