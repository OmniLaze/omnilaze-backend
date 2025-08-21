import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common'
import { AdminOrSystemKeyGuard } from '../../common/guards/admin-or-system-key.guard'
import { NotificationsService, NotificationConfig } from './notifications.service'

@Controller('/v1/admin/notifications')
@UseGuards(AdminOrSystemKeyGuard)
export class AdminNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('/config')
  async getConfig() {
    const cfg = await this.notifications.getConfig()
    return { success: true, code: 'OK', data: cfg }
  }

  @Put('/config')
  async setConfig(@Body() body: { config: NotificationConfig }) {
    if (!body || !body.config) return { success: false, code: 'INVALID', message: 'Missing config' }
    await this.notifications.setConfig(body.config)
    return { success: true, code: 'OK' }
  }
}

