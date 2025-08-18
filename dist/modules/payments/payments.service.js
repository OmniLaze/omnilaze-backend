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
var PaymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../db/prisma.service");
const alipay_provider_1 = require("./providers/alipay.provider");
const wechatpay_provider_1 = require("./providers/wechatpay.provider");
let PaymentsService = PaymentsService_1 = class PaymentsService {
    constructor(prisma, alipay, wechatPay) {
        this.prisma = prisma;
        this.alipay = alipay;
        this.wechatPay = wechatPay;
        this.logger = new common_1.Logger(PaymentsService_1.name);
    }
    async createPayment(orderId, provider, amount, idempotencyKey, currentUserId, paymentMethod) {
        if (!orderId || !amount || amount < 0)
            return { success: false, message: '参数无效' };
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order)
            return { success: false, message: '订单不存在' };
        if (currentUserId && order.userId !== currentUserId)
            return { success: false, message: '无权为此订单创建支付' };
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
                metadata: paymentMethod ? { paymentMethod } : undefined,
            },
        });
        try {
            let paymentResult;
            if (provider === 'alipay') {
                // 支付宝H5支付（手机网站支付）
                if (paymentMethod === 'h5' || !paymentMethod) {
                    const h5Result = await this.alipay.createH5Payment({
                        outTradeNo,
                        amount,
                        subject: payment.subject || `订单 ${order.orderNumber}`,
                        notifyUrl: process.env.ALIPAY_NOTIFY_URL || 'https://backend.omnilaze.co/v1/payments/webhook/alipay',
                        returnUrl: process.env.ALIPAY_RETURN_URL || 'https://order.omnilaze.co/payment/callback',
                    });
                    // 存储H5链接
                    await this.prisma.payment.update({
                        where: { id: payment.id },
                        data: {
                            metadata: {
                                h5Url: h5Result.h5_url,
                                paymentMethod: 'h5'
                            }
                        }
                    });
                    return {
                        success: true,
                        message: '支付宝H5支付创建成功',
                        data: {
                            payment_id: payment.id,
                            h5_url: h5Result.h5_url,
                            provider: 'alipay',
                            payment_method: 'h5'
                        }
                    };
                }
                else {
                    // 扫码支付
                    const paymentResult = await this.alipay.precreate(payment, order);
                    if (paymentResult.qr_code) {
                        await this.prisma.payment.update({
                            where: { id: payment.id },
                            data: { qrCode: paymentResult.qr_code }
                        });
                    }
                    return {
                        success: true,
                        message: '支付创建成功',
                        data: {
                            payment_id: payment.id,
                            qr_code: paymentResult.qr_code,
                            provider: 'alipay'
                        }
                    };
                }
            }
            else if (provider === 'wechatpay') {
                // 微信支付处理
                const amountInCents = Math.round(amount * 100); // 转换为分
                if (paymentMethod === 'h5') {
                    // H5支付
                    const h5Result = await this.wechatPay.createH5Payment({
                        outTradeNo,
                        amount: amountInCents,
                        description: payment.subject || `订单 ${order.orderNumber}`,
                    });
                    // 存储H5链接
                    await this.prisma.payment.update({
                        where: { id: payment.id },
                        data: {
                            metadata: {
                                ...(payment.metadata || {}),
                                h5Url: h5Result.h5_url,
                                paymentMethod: 'h5'
                            }
                        }
                    });
                    return {
                        success: true,
                        message: '微信H5支付创建成功',
                        data: {
                            payment_id: payment.id,
                            h5_url: h5Result.h5_url,
                            provider: 'wechatpay',
                            payment_method: 'h5'
                        }
                    };
                }
                else if (paymentMethod === 'jsapi') {
                    // JSAPI支付（需要openid）
                    // TODO: 从用户信息中获取openid
                    this.logger.warn('JSAPI payment requires openid, not implemented yet');
                    throw new Error('JSAPI支付暂未实现');
                }
                else {
                    // Native支付（扫码支付）
                    // TODO: 实现Native支付
                    this.logger.warn('Native payment not implemented yet');
                    throw new Error('Native支付暂未实现');
                }
            }
            throw new Error(`不支持的支付提供商: ${provider}`);
        }
        catch (error) {
            // 支付创建失败，标记payment状态
            await this.prisma.payment.update({
                where: { id: payment.id },
                data: { status: 'failed', metadata: { error: error.message } }
            });
            this.logger.error(`Payment creation failed for order ${orderId}:`, error);
            return { success: false, message: error.message || '支付创建失败' };
        }
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
    async handleWechatPayWebhook(req) {
        const headers = req.headers;
        const body = req.body;
        const verified = await this.wechatPay.verifyNotification(headers, body);
        if (!verified.ok) {
            this.logger.error('WeChat Pay webhook verification failed');
            return false;
        }
        const data = verified.data;
        // 获取订单号和交易状态
        const outTradeNo = data.out_trade_no;
        const tradeState = data.trade_state;
        const transactionId = data.transaction_id;
        // 查找支付记录
        const payment = await this.prisma.payment.findFirst({ where: { outTradeNo } });
        if (!payment) {
            this.logger.error(`Payment not found for outTradeNo: ${outTradeNo}`);
            return false;
        }
        // 幂等性检查
        if (payment.status === 'succeeded') {
            this.logger.log(`Payment already succeeded for outTradeNo: ${outTradeNo}`);
            return true;
        }
        // 处理支付成功
        if (tradeState === 'SUCCESS') {
            await this.prisma.$transaction([
                this.prisma.payment.update({
                    where: { id: payment.id },
                    data: {
                        status: 'succeeded',
                        transactionId,
                        paidAt: new Date(),
                        updatedAt: new Date(),
                        metadata: {
                            ...(payment.metadata || {}),
                            wechatPayData: data
                        }
                    }
                }),
                this.prisma.order.update({
                    where: { id: payment.orderId },
                    data: {
                        paymentStatus: 'paid',
                        paidAt: new Date(),
                        paymentId: payment.id
                    }
                }),
                this.prisma.paymentEvent.create({
                    data: {
                        paymentId: payment.id,
                        eventType: 'wechat_notify',
                        payload: data
                    }
                })
            ]);
            this.logger.log(`WeChat payment succeeded for order: ${payment.orderId}`);
            return true;
        }
        // 处理其他状态
        await this.prisma.paymentEvent.create({
            data: {
                paymentId: payment.id,
                eventType: 'wechat_notify',
                payload: data
            }
        });
        // 更新支付状态
        if (tradeState === 'CLOSED' || tradeState === 'REVOKED' || tradeState === 'PAYERROR') {
            await this.prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'failed',
                    updatedAt: new Date(),
                    metadata: {
                        ...(payment.metadata || {}),
                        failureReason: tradeState
                    }
                }
            });
        }
        return true;
    }
    async queryPaymentStatus(paymentId, currentUserId) {
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId }
        });
        if (!payment) {
            return { success: false, message: '支付记录不存在' };
        }
        // 获取关联的订单信息
        const order = await this.prisma.order.findUnique({
            where: { id: payment.orderId }
        });
        if (!order) {
            return { success: false, message: '关联订单不存在' };
        }
        // 验证用户权限
        if (currentUserId && order.userId !== currentUserId) {
            return { success: false, message: '无权查询此支付状态' };
        }
        // 如果已经是终态，直接返回
        if (payment.status === 'succeeded' || payment.status === 'failed' || payment.status === 'refunded') {
            return {
                success: true,
                data: {
                    payment_id: payment.id,
                    status: payment.status,
                    provider: payment.provider,
                    amount: payment.amount,
                    paid_at: payment.paidAt,
                    transaction_id: payment.transactionId
                }
            };
        }
        // 主动查询支付状态
        try {
            if (payment.provider === 'alipay') {
                const result = await this.alipay.query(payment.outTradeNo);
                // 更新支付状态
                if (result.trade_status === 'TRADE_SUCCESS' && payment.status !== 'succeeded') {
                    await this.prisma.$transaction([
                        this.prisma.payment.update({
                            where: { id: payment.id },
                            data: {
                                status: 'succeeded',
                                transactionId: result.trade_no,
                                paidAt: new Date(result.send_pay_date || result.gmt_payment),
                                updatedAt: new Date()
                            }
                        }),
                        this.prisma.order.update({
                            where: { id: payment.orderId },
                            data: {
                                paymentStatus: 'paid',
                                paidAt: new Date(result.send_pay_date || result.gmt_payment),
                                paymentId: payment.id
                            }
                        })
                    ]);
                    return {
                        success: true,
                        data: {
                            payment_id: payment.id,
                            status: 'succeeded',
                            provider: payment.provider,
                            amount: payment.amount,
                            paid_at: new Date(result.send_pay_date || result.gmt_payment),
                            transaction_id: result.trade_no
                        }
                    };
                }
                // 映射支付宝状态到我们的状态
                const statusMap = {
                    'WAIT_BUYER_PAY': 'created',
                    'TRADE_CLOSED': 'failed',
                    'TRADE_SUCCESS': 'succeeded',
                    'TRADE_FINISHED': 'succeeded'
                };
                const mappedStatus = statusMap[result.trade_status] || payment.status;
                if (mappedStatus !== payment.status) {
                    await this.prisma.payment.update({
                        where: { id: payment.id },
                        data: { status: mappedStatus, updatedAt: new Date() }
                    });
                }
                return {
                    success: true,
                    data: {
                        payment_id: payment.id,
                        status: mappedStatus,
                        provider: payment.provider,
                        amount: payment.amount,
                        alipay_trade_status: result.trade_status,
                        alipay_trade_msg: result.msg
                    }
                };
            }
            else if (payment.provider === 'wechatpay') {
                const result = await this.wechatPay.queryOrder(payment.outTradeNo);
                // 更新支付状态
                if (result.trade_state === 'SUCCESS' && payment.status !== 'succeeded') {
                    await this.prisma.$transaction([
                        this.prisma.payment.update({
                            where: { id: payment.id },
                            data: {
                                status: 'succeeded',
                                transactionId: result.transaction_id,
                                paidAt: new Date(result.success_time),
                                updatedAt: new Date()
                            }
                        }),
                        this.prisma.order.update({
                            where: { id: payment.orderId },
                            data: {
                                paymentStatus: 'paid',
                                paidAt: new Date(result.success_time),
                                paymentId: payment.id
                            }
                        })
                    ]);
                    return {
                        success: true,
                        data: {
                            payment_id: payment.id,
                            status: 'succeeded',
                            provider: payment.provider,
                            amount: payment.amount,
                            paid_at: new Date(result.success_time),
                            transaction_id: result.transaction_id
                        }
                    };
                }
                // 映射微信支付状态到我们的状态
                const statusMap = {
                    'NOTPAY': 'created',
                    'USERPAYING': 'processing',
                    'SUCCESS': 'succeeded',
                    'CLOSED': 'failed',
                    'REVOKED': 'failed',
                    'PAYERROR': 'failed',
                    'REFUND': 'refunded'
                };
                const mappedStatus = statusMap[result.trade_state] || payment.status;
                if (mappedStatus !== payment.status) {
                    await this.prisma.payment.update({
                        where: { id: payment.id },
                        data: { status: mappedStatus, updatedAt: new Date() }
                    });
                }
                return {
                    success: true,
                    data: {
                        payment_id: payment.id,
                        status: mappedStatus,
                        provider: payment.provider,
                        amount: payment.amount,
                        wechat_trade_state: result.trade_state,
                        wechat_trade_state_desc: result.trade_state_desc
                    }
                };
            }
            // TODO: 实现支付宝查询
            return {
                success: true,
                data: {
                    payment_id: payment.id,
                    status: payment.status,
                    provider: payment.provider,
                    amount: payment.amount
                }
            };
        }
        catch (error) {
            this.logger.error(`Failed to query payment status for ${paymentId}:`, error);
            return { success: false, message: '查询支付状态失败' };
        }
    }
    async refundPayment(paymentId, refundAmount, reason, currentUserId) {
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId }
        });
        if (!payment) {
            return { success: false, message: '支付记录不存在' };
        }
        // 获取关联的订单信息
        const order = await this.prisma.order.findUnique({
            where: { id: payment.orderId }
        });
        if (!order) {
            return { success: false, message: '关联订单不存在' };
        }
        // 验证用户权限
        if (currentUserId && order.userId !== currentUserId) {
            return { success: false, message: '无权退款此订单' };
        }
        // 检查支付状态（允许对已部分退款的订单继续退款）
        const refundableStatuses = ['succeeded', 'partial_refunded'];
        if (!refundableStatuses.includes(payment.status)) {
            return { success: false, message: '只有支付成功的订单才能退款' };
        }
        // 历史已退金额与剩余可退
        const metaBefore = (payment.metadata || {});
        const prevRefunded = Number(metaBefore.refundTotal || 0);
        const remaining = Math.max(0, payment.amount - prevRefunded);
        if (remaining <= 0) {
            return { success: false, message: '该支付已全额退款' };
        }
        // 退款金额默认为剩余全额
        const actualRefundAmount = refundAmount || remaining;
        if (actualRefundAmount > remaining) {
            return { success: false, message: `退款金额不能超过剩余可退金额（¥${remaining.toFixed(2)}）` };
        }
        try {
            let refundResult;
            const outRefundNo = `RF${payment.outTradeNo}_${Date.now()}`;
            if (payment.provider === 'alipay') {
                // 支付宝退款
                refundResult = await this.alipay.refund({
                    outTradeNo: payment.outTradeNo,
                    refundAmount: actualRefundAmount,
                    refundReason: reason || '用户申请退款',
                    outRequestNo: outRefundNo, // 部分退款需要提供
                });
                if (!refundResult.success) {
                    throw new Error(refundResult.message || '退款失败');
                }
                // 计算新的累计退款金额与状态
                const newRefundedTotal = prevRefunded + actualRefundAmount;
                const isFull = newRefundedTotal >= payment.amount - 1e-6;
                // 更新支付和订单状态
                await this.prisma.$transaction([
                    this.prisma.payment.update({
                        where: { id: payment.id },
                        data: {
                            status: isFull ? 'refunded' : 'partial_refunded',
                            refundedAt: isFull ? new Date() : null,
                            metadata: {
                                ...(metaBefore || {}),
                                refundTotal: newRefundedTotal,
                                refundInfo: {
                                    outRefundNo,
                                    refundTime: refundResult.gmt_refund_pay,
                                    refundFee: refundResult.refund_fee,
                                },
                                refundHistory: [
                                    ...(((metaBefore || {}).refundHistory) || []),
                                    {
                                        outRefundNo,
                                        amount: actualRefundAmount,
                                        refundTime: refundResult.gmt_refund_pay || new Date().toISOString(),
                                        reason,
                                    },
                                ],
                            },
                            updatedAt: new Date(),
                        },
                    }),
                    this.prisma.order.update({
                        where: { id: payment.orderId },
                        data: {
                            paymentStatus: isFull ? 'refunded' : 'partial_refunded',
                            updatedAt: new Date(),
                        },
                    }),
                    this.prisma.paymentEvent.create({
                        data: {
                            paymentId: payment.id,
                            eventType: 'refund',
                            payload: {
                                amount: actualRefundAmount,
                                reason,
                                result: refundResult,
                                isPartial: !isFull,
                            },
                        },
                    }),
                ]);
                return {
                    success: true,
                    message: isFull ? '全额退款成功' : '部分退款成功',
                    data: {
                        refundAmount: actualRefundAmount,
                        refundId: outRefundNo,
                        refundTime: refundResult.gmt_refund_pay
                    }
                };
            }
            else if (payment.provider === 'wechatpay') {
                const outRefundNo = `RF${payment.outTradeNo}_${Date.now()}`;
                const amountInCents = Math.round(payment.amount * 100);
                const refundAmountInCents = Math.round(actualRefundAmount * 100);
                const result = await this.wechatPay.refundOrder({
                    outTradeNo: payment.outTradeNo,
                    outRefundNo,
                    amount: amountInCents,
                    refundAmount: refundAmountInCents,
                    reason: reason || '用户申请退款'
                });
                const newRefundedTotal = prevRefunded + actualRefundAmount;
                const isFull = newRefundedTotal >= payment.amount - 1e-6;
                // 更新支付和订单状态
                await this.prisma.$transaction([
                    this.prisma.payment.update({
                        where: { id: payment.id },
                        data: {
                            status: isFull ? 'refunded' : 'partial_refunded',
                            refundedAt: isFull ? new Date() : null,
                            updatedAt: new Date(),
                            metadata: {
                                ...(metaBefore || {}),
                                refundTotal: newRefundedTotal,
                                refundData: result,
                                refundHistory: [
                                    ...(((metaBefore || {}).refundHistory) || []),
                                    {
                                        outRefundNo,
                                        amount: actualRefundAmount,
                                        reason,
                                        time: new Date().toISOString(),
                                        wechat: result,
                                    },
                                ],
                            },
                        },
                    }),
                    this.prisma.order.update({
                        where: { id: payment.orderId },
                        data: {
                            paymentStatus: isFull ? 'refunded' : 'partial_refunded',
                            updatedAt: new Date(),
                        },
                    }),
                    this.prisma.paymentEvent.create({
                        data: {
                            paymentId: payment.id,
                            eventType: 'refund',
                            payload: {
                                refundId: result.refund_id,
                                outRefundNo,
                                refundAmount: actualRefundAmount,
                                reason,
                                isPartial: !isFull,
                            },
                        },
                    }),
                ]);
                return {
                    success: true,
                    message: isFull ? '全额退款成功' : '部分退款成功',
                    data: {
                        payment_id: payment.id,
                        refund_id: result.refund_id,
                        refund_amount: actualRefundAmount,
                        status: isFull ? 'refunded' : 'partial_refunded',
                    },
                };
            }
            return { success: false, message: '暂不支持该支付方式的退款' };
        }
        catch (error) {
            this.logger.error(`Failed to refund payment ${paymentId}:`, error);
            return { success: false, message: error.message || '退款失败' };
        }
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        alipay_provider_1.AlipayProvider,
        wechatpay_provider_1.WechatPayProvider])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map