import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { AlipayGatewayController } from './alipay.gateway.controller';
import { PaymentsService } from './payments.service';
import { AlipayProvider } from './providers/alipay.provider';
import { WechatPayProvider } from './providers/wechatpay.provider';
import { ConfigModule } from '../../config/config.module';
import { PrismaModule } from '../../db/prisma.module';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ConfigModule, PrismaModule, NotificationsModule],
  controllers: [PaymentsController, AlipayGatewayController],
  providers: [PaymentsService, AlipayProvider, WechatPayProvider, JwtAuthGuard],
  exports: [PaymentsService],
})
export class PaymentsModule {}

