import { Module } from '@nestjs/common';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';
import { ConfigModule } from '../../config/config.module';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SystemKeyGuard } from '../../common/guards/system-key.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminOrSystemKeyGuard } from '../../common/guards/admin-or-system-key.guard';

@Module({
  imports: [ConfigModule],
  controllers: [InvitesController],
  providers: [InvitesService, JwtAuthGuard, SystemKeyGuard, AdminGuard, AdminOrSystemKeyGuard],
})
export class InvitesModule {}

