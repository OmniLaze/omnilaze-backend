import { PrismaService } from '../../db/prisma.service';
export declare class OrdersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createOrder(userId: string, phoneNumber: string, formData: any): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: {
            order_id: string;
            order_number: string;
        };
    }>;
    submitOrder(orderId: string, userId: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: {
            order_number: string;
        };
    }>;
    updateOrderFeedback(orderId: string, userId: string, rating: number, feedback?: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getUserOrders(userId: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: {
            orders: {
                arrivalImageUrl: string;
                arrivalImageTakenAt: Date;
                arrivalImageSource: string;
                feedbacks: {
                    id: string;
                    createdAt: Date;
                    userId: string;
                    rating: number;
                    comment: string | null;
                    orderId: string;
                }[];
                id: string;
                orderNumber: string;
                phoneNumber: string;
                status: string;
                orderDate: Date;
                createdAt: Date;
                submittedAt: Date | null;
                deliveryAddress: string;
                deliveryTime: string | null;
                dietaryRestrictions: string | null;
                foodPreferences: string | null;
                budgetAmount: number;
                budgetCurrency: string;
                metadata: import("@prisma/client/runtime/library").JsonValue | null;
                userSequenceNumber: number | null;
                isDeleted: boolean;
                updatedAt: Date | null;
                paymentStatus: string | null;
                paidAt: Date | null;
                paymentId: string | null;
                arrivalImageImportedAt: Date | null;
                userId: string;
            }[];
            count: number;
        };
    }>;
    listOrders(userId: string, filters: {
        status?: string;
    }, paging: {
        page: number;
        pageSize: number;
    }): Promise<{
        items: {
            id: string;
            orderNumber: string;
            phoneNumber: string;
            status: string;
            orderDate: Date;
            createdAt: Date;
            submittedAt: Date | null;
            deliveryAddress: string;
            deliveryTime: string | null;
            dietaryRestrictions: string | null;
            foodPreferences: string | null;
            budgetAmount: number;
            budgetCurrency: string;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            userSequenceNumber: number | null;
            isDeleted: boolean;
            updatedAt: Date | null;
            paymentStatus: string | null;
            paidAt: Date | null;
            paymentId: string | null;
            arrivalImageUrl: string | null;
            arrivalImageSource: string | null;
            arrivalImageTakenAt: Date | null;
            arrivalImageImportedAt: Date | null;
            userId: string;
        }[];
        page: number;
        page_size: number;
        total: number;
    }>;
    private generateOrderNumber;
    adminListOrders(params: {
        since?: string;
        status?: string;
        limit: number;
    }): Promise<{
        items: {
            id: string;
            orderNumber: string;
            status: string;
            createdAt: Date;
            deliveryAddress: string;
            budgetAmount: number;
            arrivalImageUrl: string;
            phoneNumber: string;
            deliveryTime: string;
            dietaryRestrictions: string;
            foodPreferences: string;
            userSequence: number;
        }[];
        next_since: string;
    }>;
    adminGetOrderDetail(orderId: string): Promise<{
        payments: {
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
        }[];
        feedbacks: {
            id: string;
            createdAt: Date;
            userId: string;
            rating: number;
            comment: string | null;
            orderId: string;
        }[];
        id: string;
        orderNumber: string;
        phoneNumber: string;
        status: string;
        orderDate: Date;
        createdAt: Date;
        submittedAt: Date | null;
        deliveryAddress: string;
        deliveryTime: string | null;
        dietaryRestrictions: string | null;
        foodPreferences: string | null;
        budgetAmount: number;
        budgetCurrency: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        userSequenceNumber: number | null;
        isDeleted: boolean;
        updatedAt: Date | null;
        paymentStatus: string | null;
        paidAt: Date | null;
        paymentId: string | null;
        arrivalImageUrl: string | null;
        arrivalImageSource: string | null;
        arrivalImageTakenAt: Date | null;
        arrivalImageImportedAt: Date | null;
        userId: string;
    }>;
    importArrivalImage(orderId: string, data: {
        image_url: string;
        source?: string;
        taken_at?: string;
    }): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: {
            arrival_image_url: string;
            taken_at: Date;
            source: string;
        };
    }>;
    importArrivalImageByNumber(data: {
        order_number: string;
        image_url: string;
        source?: string;
        taken_at?: string;
    }): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: {
            order_id: string;
            arrival_image_url: string;
            taken_at: Date;
            source: string;
        };
    }>;
    getArrivalImage(orderId: string, userId: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        data: {
            arrival_image_url: string;
            taken_at: Date;
            source: string;
        };
        message?: undefined;
    }>;
    uploadVoiceFeedback(orderId: string, data: {
        audioUrl: string;
        userId: string;
        durationSec?: number;
        transcript?: string;
    }): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: {
            id: string;
            audio_url: string;
            duration_sec: number;
            created_at: Date;
        };
    }>;
}
