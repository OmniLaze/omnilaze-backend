import { Module, OnModuleInit } from '@nestjs/common'
import { PrismaModule } from '../../db/prisma.module'
import { NotificationsService } from './notifications.service'
import { AdminNotificationsController } from './admin.notifications.controller'
import { ConfigModule } from '../../config/config.module'

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [AdminNotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule implements OnModuleInit {
  constructor(private readonly notifications: NotificationsService) {}
  async onModuleInit() {
    await this.notifications.ensureStorage()
  }
}

