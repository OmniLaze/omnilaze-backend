import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Response, Request } from 'express';

@Controller('/v1/payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('/create')
  async create(@Body() body: { order_id: string; provider: 'alipay'; amount: number; idempotency_key?: string }) {
    const res = await this.payments.createPayment(body.order_id, body.provider, body.amount, body.idempotency_key);
    return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message, data: res.data };
  }

  @Get('/:paymentId')
  async get(@Param('paymentId') paymentId: string) {
    const res = await this.payments.getPayment(paymentId);
    return { success: !!res, code: res ? 'OK' : 'NOT_FOUND', data: res };
  }

  @Post('/webhook/alipay')
  async alipayWebhook(@Req() req: Request, @Res() res: Response) {
    const ok = await this.payments.handleAlipayWebhook(req);
    // Alipay expects 'success' to acknowledge
    return res.status(200).send(ok ? 'success' : 'failure');
  }
}


