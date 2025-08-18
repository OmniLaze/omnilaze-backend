import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Response, Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';

@Controller('/v1/payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('/create')
  @UseGuards(JwtAuthGuard)
  async create(
    @CurrentUserId() userId: string,
    @Body() body: { 
      order_id: string; 
      provider: 'alipay' | 'wechatpay'; 
      amount: number; 
      idempotency_key?: string;
      payment_method?: 'h5' | 'jsapi' | 'native';
    },
  ) {
    const res = await this.payments.createPayment(
      body.order_id, 
      body.provider, 
      body.amount, 
      body.idempotency_key, 
      userId,
      body.payment_method
    );
    return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message, data: res.data };
  }

  @Get('/:paymentId')
  @UseGuards(JwtAuthGuard)
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

  @Post('/webhook/wechatpay')
  async wechatPayWebhook(@Req() req: Request, @Res() res: Response) {
    const ok = await this.payments.handleWechatPayWebhook(req);
    // WeChat Pay expects specific response format
    if (ok) {
      return res.status(200).json({ code: 'SUCCESS', message: '成功' });
    } else {
      return res.status(400).json({ code: 'FAIL', message: '失败' });
    }
  }

  @Get('/:paymentId/status')
  @UseGuards(JwtAuthGuard)
  async queryStatus(
    @CurrentUserId() userId: string,
    @Param('paymentId') paymentId: string,
  ) {
    const res = await this.payments.queryPaymentStatus(paymentId, userId);
    return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message, data: res.data };
  }

  @Post('/:paymentId/refund')
  @UseGuards(JwtAuthGuard)
  async refund(
    @CurrentUserId() userId: string,
    @Param('paymentId') paymentId: string,
    @Body() body: { amount?: number; reason?: string },
  ) {
    const res = await this.payments.refundPayment(paymentId, body.amount, body.reason, userId);
    return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message, data: res.data };
  }
}

