import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { AlipayProvider } from './providers/alipay.provider';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, AlipayProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}


