import { PrismaService } from '../../db/prisma.service';
import { OrdersGateway } from './orders.gateway';
export declare class OrdersService {
    private readonly prisma;
    private readonly ordersGateway;
    constructor(prisma: PrismaService, ordersGateway: OrdersGateway);
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
            is_test_order: boolean;
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
    getLatestOrder(userId: string): Promise<{
        success: boolean;
        message: string;
        data: any;
    }>;
    getUserOrders(userId: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: {
            orders: any[];
            count: number;
        };
    }>;
    listOrders(userId: string, filters: {
        status?: string;
    }, paging: {
        page: number;
        pageSize: number;
    }): Promise<{
        items: any[];
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
        items: any[];
        next_since: string;
    }>;
    adminUpdateOrderStatus(orderId: string, status: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: {
            id: any;
            status: any;
            displayStatus: any;
        };
    }>;
    adminGetOrderDetail(orderId: string): Promise<any>;
    updateOrderEta(orderId: string, etaIso?: string | null, source?: string | null): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: {
            eta_estimated_at: any;
            eta_source: any;
        };
    }>;
    getUserOrderEta(orderId: string, userId: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        data: {
            eta_estimated_at: any;
            eta_source: any;
        };
        message?: undefined;
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
    adminSetOrderSelecting(orderId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    adminSetOrderETA(orderId: string, estimatedDeliveryTime: string): Promise<{
        success: boolean;
        message: string;
    }>;
    adminSetOrderDelivered(orderId: string, arrivalImageUrl: string, takenAt?: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
