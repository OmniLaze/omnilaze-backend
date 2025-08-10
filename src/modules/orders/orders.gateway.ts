import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/ws', cors: { origin: '*' } })
export class OrdersGateway {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('subscribe.user')
  handleSubscribeUser(@MessageBody() data: { userId: string }, @ConnectedSocket() client: Socket) {
    if (data?.userId) client.join(`user:${data.userId}`);
    return { ok: true };
  }

  @SubscribeMessage('subscribe.order')
  handleSubscribeOrder(@MessageBody() data: { orderId: string }, @ConnectedSocket() client: Socket) {
    if (data?.orderId) client.join(`order:${data.orderId}`);
    return { ok: true };
  }

  broadcastOrderUpdated(orderId: string, userId: string, payload: any) {
    this.server.to([`order:${orderId}`, `user:${userId}`]).emit('order.updated', payload);
  }

  broadcastPaymentUpdated(orderId: string, userId: string, payload: any) {
    this.server.to([`order:${orderId}`, `user:${userId}`]).emit('payment.updated', payload);
  }
}


