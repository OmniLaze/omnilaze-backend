import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { HealthModule } from './modules/health/health.module';
import { PrismaModule } from './db/prisma.module';
import { OrdersModule } from './modules/orders/orders.module';
import { AuthModule } from './modules/auth/auth.module';
import { PreferencesModule } from './modules/preferences/preferences.module';
import { InvitesModule } from './modules/invites/invites.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    OrdersModule,
    PreferencesModule,
    InvitesModule,
    PaymentsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}


