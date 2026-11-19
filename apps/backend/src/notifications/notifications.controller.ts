import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(@Req() req: any, @Query() query: NotificationQueryDto) {
    const userId = req.user.id;
    return this.notificationsService.findAll(userId, query);
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req: any) {
    const userId = req.user.id;
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    return this.notificationsService.markAsRead(id, userId);
  }

  @Post('test')
  async sendTestNotification(@Req() req: any, @Body() body: Partial<CreateNotificationDto>) {
    const userId = req.user.id;
    return this.notificationsService.create({
      userId,
      title: body.title || '🔔 Notificação de Teste MOVY',
      message: body.message || 'Esta é uma notificação disparada para validar o sistema de alertas.',
      link: body.link || '/tasks',
      type: body.type || 'SYSTEM',
      sendWhatsApp: body.sendWhatsApp !== undefined ? body.sendWhatsApp : true,
    });
  }
}
