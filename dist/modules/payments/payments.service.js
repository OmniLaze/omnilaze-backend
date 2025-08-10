"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../db/prisma.service");
const alipay_provider_1 = require("./providers/alipay.provider");
let PaymentsService = class PaymentsService {
    constructor(prisma, alipay) {
        this.prisma = prisma;
        this.alipay = alipay;
    }
    async createPayment(orderId, provider, amount, idempotencyKey) {
        if (!orderId || !amount || amount < 0)
            return { success: false, message: '参数无效' };
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order)
            return { success: false, message: '订单不存在' };
        if (order.paymentStatus === 'paid')
            return { success: true, message: '订单已支付', data: { payment_id: order.paymentId } };
        if (idempotencyKey) {
            const exist = await this.prisma.payment.findUnique({ where: { idempotencyKey } }).catch(() => null);
            if (exist)
                return { success: true, message: '已创建', data: exist };
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
    async getPayment(paymentId) {
        return this.prisma.payment.findUnique({ where: { id: paymentId } });
    }
    async handleAlipayWebhook(req) {
        const verified = await this.alipay.verifyWebhook(req);
        if (!verified.ok)
            return false;
        const data = verified.data;
        // idempotent update
        const payment = await this.prisma.payment.findFirst({ where: { outTradeNo: data.out_trade_no } });
        if (!payment)
            return false;
        if (payment.status === 'succeeded')
            return true;
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
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, alipay_provider_1.AlipayProvider])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map