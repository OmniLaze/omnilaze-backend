import { OrdersService } from './orders.service';
export declare class OrdersController {
    private readonly orders;
    constructor(orders: OrdersService);
    create(body: {
        user_id: string;
        phone_number: string;
        form_data: any;
    }): Promise<{
        success: boolean;
        code: string;
        message: string;
        data: {
            order_id: string;
            order_number: string;
        } | undefined;
    }>;
    submit(body: {
        order_id: string;
    }): Promise<{
        success: boolean;
        code: string;
        message: string;
        data: {
            order_number: string;
        } | undefined;
    }>;
    feedback(body: {
        order_id: string;
        rating: number;
        feedback?: string;
    }): Promise<{
        success: boolean;
        code: string;
        message: string;
    }>;
    list(userId: string): Promise<{
        success: boolean;
        code: string;
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
        } | undefined;
        message: string;
    }>;
    history(userId: string, status?: string, page?: string, pageSize?: string): Promise<{
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
        };
    }>;
}
