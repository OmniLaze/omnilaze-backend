import { PaymentsService } from './payments.service';
import { Response, Request } from 'express';
export declare class PaymentsController {
    private readonly payments;
    constructor(payments: PaymentsService);
    create(userId: string, body: {
        order_id: string;
        provider: 'alipay' | 'wechatpay';
        amount: number;
        idempotency_key?: string;
        payment_method?: 'h5' | 'jsapi' | 'native';
    }): Promise<{
        success: boolean;
        code: string;
        message: any;
        data: any;
    }>;
    get(paymentId: string): Promise<{
        success: boolean;
        code: string;
        data: {
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
        };
    }>;
    alipayWebhook(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    wechatPayWebhook(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    queryStatus(userId: string, paymentId: string): Promise<{
        success: boolean;
        code: string;
        message: string;
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
        } | {
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
        } | {
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
        } | {
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
    }>;
    refund(userId: string, paymentId: string, body: {
        amount?: number;
        reason?: string;
    }): Promise<{
        success: boolean;
        code: string;
        message: any;
        data: {
            refundAmount: number;
            refundId: string;
            refundTime: any;
            payment_id?: undefined;
            refund_id?: undefined;
            refund_amount?: undefined;
            status?: undefined;
        } | {
            payment_id: string;
            refund_id: any;
            refund_amount: number;
            status: string;
            refundAmount?: undefined;
            refundId?: undefined;
            refundTime?: undefined;
        };
    }>;
}
