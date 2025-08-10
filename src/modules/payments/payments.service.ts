import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { AlipayProvider } from './providers/alipay.provider';
import { Request } from 'express';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService, private readonly alipay: AlipayProvider) {}

  async createPayment(orderId: string, provider: 'alipay', amount: number, idempotencyKey?: string) {
    if (!orderId || !amount || amount < 0) return { success: false, message: '参数无效' };
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return { success: false, message: '订单不存在' };
    if (order.paymentStatus === 'paid') return { success: true, message: '订单已支付', data: { payment_id: order.paymentId } };

    if (idempotencyKey) {
      const exist = await this.prisma.payment.findUnique({ where: { idempotencyKey } }).catch(() => null);
      if (exist) return { success: true, message: '已创建', data: exist };
    }

    const outTradeNo = `OD${order.orderNumber}`;
    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider,
        status: 'created',
        amount,
        currency: 'CNY',
        subject: `Order ${order.orderNumber}`,
        outTradeNo,
        idempotencyKey: idempotencyKey || null,
      },
    });

    const created = await this.alipay.precreate(payment, order);
    // store returned qr code if any
    if (created.qr_code) {
      await this.prisma.payment.update({ where: { id: payment.id }, data: { qrCode: created.qr_code } });
    }
    return { success: true, message: '支付创建成功', data: { payment_id: payment.id, qr_code: created.qr_code } };
  }

  async getPayment(paymentId: string) {
    return this.prisma.payment.findUnique({ where: { id: paymentId } });
  }

  async handleAlipayWebhook(req: Request) {
    const verified = await this.alipay.verifyWebhook(req);
    if (!verified.ok) return false;
    const data = verified.data;
    // idempotent update
    const payment = await this.prisma.payment.findFirst({ where: { outTradeNo: data.out_trade_no } });
    if (!payment) return false;
    if (payment.status === 'succeeded') return true;
    if (data.trade_status === 'TRADE_SUCCESS' || data.trade_status === 'TRADE_FINISHED') {
      await this.prisma.$transaction([
        this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'succeeded', transactionId: data.trade_no, paidAt: new Date(), updatedAt: new Date() } }),
        this.prisma.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'paid', paidAt: new Date(), paymentId: payment.id } }),
        this.prisma.paymentEvent.create({ data: { paymentId: payment.id, eventType: 'notify', payload: data } }),
      ]);
      return true;
    }
    // other statuses can be handled as needed
    await this.prisma.paymentEvent.create({ data: { paymentId: payment.id, eventType: 'notify', payload: data } });
    return true;
  }
}


