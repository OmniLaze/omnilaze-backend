import { OrdersService } from './orders.service';
import { CreateOrderDto, SubmitOrderDto, OrderFeedbackDto, ImportArrivalImageDto, ImportArrivalImageByNumberDto } from './dto/orders.dto';
export declare class OrdersController {
    private readonly orders;
    constructor(orders: OrdersService);
    create(userId: string, phoneNumber: string, body: CreateOrderDto): Promise<{
        success: boolean;
        code: string;
        message: string;
        data: {
            order_id: string;
            order_number: string;
        };
    }>;
    submit(userId: string, body: SubmitOrderDto): Promise<{
        success: boolean;
        code: string;
        message: string;
        data: {
            order_number: string;
        };
    }>;
    feedback(userId: string, body: OrderFeedbackDto): Promise<{
        success: boolean;
        code: string;
        message: string;
    }>;
    list(currentUserId: string, userId: string): Promise<{
        success: boolean;
        code: string;
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
        message: string;
    }>;
    history(currentUserId: string, userId: string, status?: string, page?: string, pageSize?: string): Promise<{
        success: boolean;
        code: string;
        data: {
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
        };
    }>;
    importArrivalImage(orderId: string, body: ImportArrivalImageDto): Promise<{
        success: boolean;
        code: string;
        message: string;
        data: {
            arrival_image_url: string;
            taken_at: Date;
            source: string;
        };
    }>;
    importArrivalImageByNumber(body: ImportArrivalImageByNumberDto): Promise<{
        success: boolean;
        code: string;
        message: string;
        data: {
            order_id: string;
            arrival_image_url: string;
            taken_at: Date;
            source: string;
        };
    }>;
    adminUploadArrivalImage(orderId: string, file: Express.Multer.File): Promise<{
        success: boolean;
        code: string;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        code: string;
        message: string;
        data: {
            arrival_image_url: string;
            taken_at: Date;
            source: string;
        };
    }>;
    getArrivalImage(userId: string, orderId: string): Promise<{
        success: boolean;
        code: string;
        data: {
            arrival_image_url: string;
            taken_at: Date;
            source: string;
        };
    }>;
    uploadVoiceFeedback(orderId: string, file: Express.Multer.File, userId: string, body: {
        duration_sec?: string;
        transcript?: string;
    }): Promise<{
        success: boolean;
        code: string;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        code: string;
        message: string;
        data: {
            id: string;
            audio_url: string;
            duration_sec: number;
            created_at: Date;
        };
    }>;
    adminList(since?: string, status?: string, limit?: string): Promise<{
        success: boolean;
        code: string;
        data: {
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
        };
    }>;
    adminGetOne(orderId: string): Promise<{
        success: boolean;
        code: string;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        code: string;
        data: {
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
        };
        message?: undefined;
    }>;
}
