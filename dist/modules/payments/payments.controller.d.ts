import { PaymentsService } from './payments.service';
import { Response, Request } from 'express';
export declare class PaymentsController {
    private readonly payments;
    constructor(payments: PaymentsService);
    create(body: {
        order_id: string;
        provider: 'alipay';
        amount: number;
        idempotency_key?: string;
    }): Promise<{
        success: boolean;
        code: string;
        message: string;
        data: {
            id: string;
            status: string;
            createdAt: Date;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            updatedAt: Date;
            paidAt: Date | null;
            orderId: string;
            outTradeNo: string;
            idempotencyKey: string | null;
            provider: string;
            amount: number;
            currency: string;
            subject: string | null;
            body: string | null;
            transactionId: string | null;
            qrCode: string | null;
            refundedAt: Date | null;
        } | {
            payment_id: string | null;
            qr_code?: undefined;
        } | {
            payment_id: string;
            qr_code: any;
        } | undefined;
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
            outTradeNo: string;
            idempotencyKey: string | null;
            provider: string;
            amount: number;
            currency: string;
            subject: string | null;
            body: string | null;
            transactionId: string | null;
            qrCode: string | null;
            refundedAt: Date | null;
        } | null;
    }>;
    alipayWebhook(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
