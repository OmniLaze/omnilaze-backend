import { Module, OnModuleInit } from '@nestjs/common'
import { PrismaModule } from '../../db/prisma.module'
import { NotificationsService } from './notifications.service'
import { AdminNotificationsController } from './admin.notifications.controller'
import { ConfigModule } from '../../config/config.module'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { AdminGuard } from '../../common/guards/admin.guard'
import { AdminOrSystemKeyGuard } from '../../common/guards/admin-or-system-key.guard'

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [AdminNotificationsController],
  providers: [NotificationsService, JwtAuthGuard, AdminGuard, AdminOrSystemKeyGuard],
  exports: [NotificationsService],
})
export class NotificationsModule implements OnModuleInit {
  constructor(private readonly notifications: NotificationsService) {}
  async onModuleInit() {
    await this.notifications.ensureStorage()
  }
}
