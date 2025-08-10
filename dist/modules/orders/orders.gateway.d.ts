import { Server, Socket } from 'socket.io';
export declare class OrdersGateway {
    server: Server;
    handleSubscribeUser(data: {
        userId: string;
    }, client: Socket): {
        ok: boolean;
    };
    handleSubscribeOrder(data: {
        orderId: string;
    }, client: Socket): {
        ok: boolean;
    };
    broadcastOrderUpdated(orderId: string, userId: string, payload: any): void;
    broadcastPaymentUpdated(orderId: string, userId: string, payload: any): void;
}
