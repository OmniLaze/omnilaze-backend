import { PrismaService } from '../../db/prisma.service';
import { AlipayProvider } from './providers/alipay.provider';
import { WechatPayProvider } from './providers/wechatpay.provider';
import { Request } from 'express';
import { NotificationsService } from '../notifications/notifications.service';
export declare class PaymentsService {
    private readonly prisma;
    private readonly alipay;
    private readonly wechatPay;
    private readonly notifications;
    private readonly logger;
    constructor(prisma: PrismaService, alipay: AlipayProvider, wechatPay: WechatPayProvider, notifications: NotificationsService);
    createPayment(orderId: string, provider: 'alipay' | 'wechatpay', amount: number, idempotencyKey?: string, currentUserId?: string, paymentMethod?: 'h5' | 'jsapi' | 'native'): Promise<{
        success: boolean;
        message: string;
        data: any;
    } | {
        success: boolean;
        message: any;
        data?: undefined;
    }>;
    getPayment(paymentId: string): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        updatedAt: Date;
        paidAt: Date | null;
        orderId: string;
        provider: string;
        amount: number;
        currency: string;
        subject: string | null;
        body: string | null;
        outTradeNo: string;
        transactionId: string | null;
        qrCode: string | null;
        idempotencyKey: string | null;
        refundedAt: Date | null;
    }>;
    handleAlipayWebhook(req: Request): Promise<boolean>;
    handleWechatPayWebhook(req: Request): Promise<boolean>;
    queryPaymentStatus(paymentId: string, currentUserId?: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        data: {
            payment_id: string;
            status: string;
            provider: string;
            amount: number;
            paid_at: Date;
            transaction_id: any;
            alipay_trade_status?: undefined;
            alipay_trade_msg?: undefined;
            wechat_trade_state?: undefined;
            wechat_trade_state_desc?: undefined;
        };
        message?: undefined;
    } | {
        success: boolean;
        data: {
            payment_id: string;
            status: string;
            provider: string;
            amount: number;
            alipay_trade_status: any;
            alipay_trade_msg: any;
            paid_at?: undefined;
            transaction_id?: undefined;
            wechat_trade_state?: undefined;
            wechat_trade_state_desc?: undefined;
        };
        message?: undefined;
    } | {
        success: boolean;
        data: {
            payment_id: string;
            status: string;
            provider: string;
            amount: number;
            wechat_trade_state: any;
            wechat_trade_state_desc: any;
            paid_at?: undefined;
            transaction_id?: undefined;
            alipay_trade_status?: undefined;
            alipay_trade_msg?: undefined;
        };
        message?: undefined;
    } | {
        success: boolean;
        data: {
            payment_id: string;
            status: string;
            provider: string;
            amount: number;
            paid_at?: undefined;
            transaction_id?: undefined;
            alipay_trade_status?: undefined;
            alipay_trade_msg?: undefined;
            wechat_trade_state?: undefined;
            wechat_trade_state_desc?: undefined;
        };
        message?: undefined;
    }>;
    refundPayment(paymentId: string, refundAmount?: number, reason?: string, currentUserId?: string): Promise<{
        success: boolean;
        message: string;
        data: {
            refundAmount: number;
            refundId: string;
            refundTime: any;
            payment_id?: undefined;
            refund_id?: undefined;
            refund_amount?: undefined;
            status?: undefined;
        };
    } | {
        success: boolean;
        message: string;
        data: {
            payment_id: string;
            refund_id: any;
            refund_amount: number;
            status: string;
            refundAmount?: undefined;
            refundId?: undefined;
            refundTime?: undefined;
        };
    } | {
        success: boolean;
        message: any;
        data?: undefined;
    }>;
}
