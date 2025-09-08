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
            is_test_order: boolean;
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
    getLatest(userId: string): Promise<{
        success: boolean;
        code: string;
        data: any;
        message: string;
    }>;
    list(currentUserId: string, userId: string): Promise<{
        success: boolean;
        code: string;
        data: {
            orders: any[];
            count: number;
        };
        message: string;
    }>;
    history(currentUserId: string, userId: string, status?: string, page?: string, pageSize?: string): Promise<{
        success: boolean;
        code: string;
        data: {
            items: any[];
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
    adminImportArrivalImage(orderId: string, body: ImportArrivalImageDto): Promise<{
        success: boolean;
        code: string;
        message: string;
        data: {
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
            items: any[];
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
        data: any;
        message?: undefined;
    }>;
    adminUpdateStatus(orderId: string, body: {
        status?: string;
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
            id: any;
            status: any;
            displayStatus: any;
        };
    }>;
    adminUpdateEta(orderId: string, body: {
        eta_at?: string;
        minutes?: number;
        source?: string;
    }): Promise<{
        success: boolean;
        code: string;
        message: string;
        data: {
            eta_estimated_at: any;
            eta_source: any;
        };
    }>;
    getEta(userId: string, orderId: string): Promise<{
        success: boolean;
        code: string;
        data: {
            eta_estimated_at: any;
            eta_source: any;
        };
        message: string;
    }>;
    adminSetSelecting(orderId: string): Promise<{
        success: boolean;
        code: string;
        message: string;
    }>;
    adminSetETA(orderId: string, body: {
        estimated_delivery_time: string;
    }): Promise<{
        success: boolean;
        code: string;
        message: string;
    }>;
    adminSetDelivered(orderId: string, body: {
        arrival_image_url: string;
        taken_at?: string;
    }): Promise<{
        success: boolean;
        code: string;
        message: string;
    }>;
}
