import { Module } from '@nestjs/common';
import { ConfigModule } from '../../config/config.module';
import { PrismaModule } from '../../db/prisma.module';
import { AdminController } from './admin.controller';
import { AdminAuthController } from './adminAuth.controller';
import { AdminUsersController } from './admin.users.controller';
import { AdminUsersService } from './admin.users.service';
import { AdminInvitationsController } from './admin.invitations.controller';
import { AdminInvitationsService } from './admin.invitations.service';
import { AdminAwsController } from './admin.aws.controller';
import { AdminAwsService } from './admin.aws.service';
import { AdminPaymentsController } from './admin.payments.controller';
import { AdminInviteCodesController } from './admin.invite-codes.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { SystemKeyGuard } from '../../common/guards/system-key.guard';
import { AdminOrSystemKeyGuard } from '../../common/guards/admin-or-system-key.guard';

@Module({
  imports: [ConfigModule, PrismaModule, PaymentsModule, NotificationsModule],
  controllers: [
    AdminController,
    AdminAuthController,
    AdminUsersController,
    AdminInvitationsController,
    AdminAwsController,
    AdminPaymentsController,
    AdminInviteCodesController,
  ],
  providers: [
    AdminUsersService,
    AdminInvitationsService,
    AdminAwsService,
    JwtAuthGuard,
    AdminGuard,
    SystemKeyGuard,
    AdminOrSystemKeyGuard,
  ],
})
export class AdminModule {}
