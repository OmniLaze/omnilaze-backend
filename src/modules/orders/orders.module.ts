import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersGateway } from './orders.gateway';
import { ConfigModule } from '../../config/config.module';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SystemKeyGuard } from '../../common/guards/system-key.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminOrSystemKeyGuard } from '../../common/guards/admin-or-system-key.guard';

@Module({
  imports: [ConfigModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersGateway, JwtAuthGuard, SystemKeyGuard, AdminGuard, AdminOrSystemKeyGuard],
  exports: [OrdersService],
})
export class OrdersModule {}

