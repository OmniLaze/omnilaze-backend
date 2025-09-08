import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '../../config/config.service';
import { PrismaService } from '../../db/prisma.service';
export declare class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly configService;
    private readonly prisma;
    private readonly logger;
    private authenticatedClients;
    constructor(configService: ConfigService, prisma: PrismaService);
    server: Server;
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): void;
    handleSubscribeUser(data: {
        userId: string;
    }, client: Socket): {
        ok: boolean;
        error: string;
    } | {
        ok: boolean;
        error?: undefined;
    };
    handleSubscribeOrder(data: {
        orderId: string;
    }, client: Socket): Promise<{
        ok: boolean;
        error: string;
    } | {
        ok: boolean;
        error?: undefined;
    }>;
    broadcastOrderUpdated(orderId: string, userId: string, payload: any): void;
    broadcastPaymentUpdated(orderId: string, userId: string, payload: any): void;
    broadcastOrderStatusChanged(orderId: string, userId: string, payload: {
        orderId: string;
        status: string;
        type: 'eta_set' | 'status_changed' | 'delivered';
        message?: string;
        estimatedDeliveryTime?: string;
        arrivalImageUrl?: string;
        updatedAt: string;
    }): void;
    broadcastOrderETASet(orderId: string, userId: string, estimatedDeliveryTime: string): void;
    broadcastOrderDelivered(orderId: string, userId: string, arrivalImageUrl?: string): void;
}
