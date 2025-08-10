import { PrismaService } from '../../db/prisma.service';
import { AlipayProvider } from './providers/alipay.provider';
import { Request } from 'express';
export declare class PaymentsService {
    private readonly prisma;
    private readonly alipay;
    constructor(prisma: PrismaService, alipay: AlipayProvider);
    createPayment(orderId: string, provider: 'alipay', amount: number, idempotencyKey?: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: {
            payment_id: string | null;
            qr_code?: undefined;
        };
    } | {
        success: boolean;
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
        };
    } | {
        success: boolean;
        message: string;
        data: {
            payment_id: string;
            qr_code: any;
        };
    }>;
    getPayment(paymentId: string): Promise<{
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
    } | null>;
    handleAlipayWebhook(req: Request): Promise<boolean>;
}
