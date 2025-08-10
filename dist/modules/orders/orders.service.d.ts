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
    submitOrder(orderId: string): Promise<{
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
    updateOrderFeedback(orderId: string, rating: number, feedback?: string): Promise<{
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
                id: string;
                orderNumber: string;
                phoneNumber: string;
                status: string;
                orderDate: Date;
                createdAt: Date;
                submittedAt: Date | null;
                deliveryAddress: string;
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
            userId: string;
        }[];
        page: number;
        page_size: number;
        total: number;
    }>;
    private generateOrderNumber;
}
