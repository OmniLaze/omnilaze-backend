import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UnauthorizedException, Logger, forwardRef, Inject } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { ConfigService } from '../../config/config.service';
import { PrismaService } from '../../db/prisma.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: process.env.CORS_ORIGINS ? JSON.parse(process.env.CORS_ORIGINS) : ['http://localhost:3000'],
    credentials: true
  }
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(OrdersGateway.name);
  private authenticatedClients = new Map<string, JwtPayload>();
  
  constructor(private readonly configService: ConfigService, private readonly prisma: PrismaService) {}
  
  @WebSocketServer()
  server!: Server;

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake auth or query
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      
      if (!token) {
        this.logger.warn(`Client ${client.id} attempted to connect without token`);
        client.disconnect();
        return;
      }
      
      // Verify JWT token
      const secret = this.configService.jwtSecret;
      const payload = jwt.verify(token as string, secret) as JwtPayload;
      
      // Store authenticated user info
      this.authenticatedClients.set(client.id, payload);
      this.logger.log(`Client ${client.id} connected as user ${payload.sub}`);
      
    } catch (error) {
      this.logger.error(`Authentication failed for client ${client.id}: ${error}`);
      client.disconnect();
    }
  }
  
  handleDisconnect(client: Socket) {
    this.authenticatedClients.delete(client.id);
    this.logger.log(`Client ${client.id} disconnected`);
  }

  @SubscribeMessage('subscribe.user')
  handleSubscribeUser(@MessageBody() data: { userId: string }, @ConnectedSocket() client: Socket) {
    const userInfo = this.authenticatedClients.get(client.id);
    
    if (!userInfo) {
      return { ok: false, error: 'Unauthorized' };
    }
    
    // Users can only subscribe to their own channel
    if (data?.userId !== userInfo.sub) {
      return { ok: false, error: 'Forbidden: Cannot subscribe to other users channel' };
    }
    
    client.join(`user:${data.userId}`);
    return { ok: true };
  }

  @SubscribeMessage('subscribe.order')
  async handleSubscribeOrder(@MessageBody() data: { orderId: string }, @ConnectedSocket() client: Socket) {
    const userInfo = this.authenticatedClients.get(client.id);
    
    if (!userInfo) {
      return { ok: false, error: 'Unauthorized' };
    }
    try {
      if (!data?.orderId) return { ok: false, error: 'Missing orderId' };
      const order = await this.prisma.order.findUnique({ where: { id: data.orderId }, select: { userId: true } });
      if (!order) return { ok: false, error: 'Order not found' };
      if (order.userId !== userInfo.sub) return { ok: false, error: 'Forbidden: Cannot subscribe to other users order' };
      client.join(`order:${data.orderId}`);
      this.logger.log(`User ${userInfo.sub} subscribed to order ${data.orderId}`);
    } catch (e) {
      this.logger.error('subscribe.order failed', e as any);
      return { ok: false, error: 'Internal error' };
    }
    return { ok: true };
  }

  broadcastOrderUpdated(orderId: string, userId: string, payload: any) {
    this.server.to([`order:${orderId}`, `user:${userId}`]).emit('order.updated', payload);
  }

  broadcastPaymentUpdated(orderId: string, userId: string, payload: any) {
    this.server.to([`order:${orderId}`, `user:${userId}`]).emit('payment.updated', payload);
  }

  // 新增：订单状态变更事件
  broadcastOrderStatusChanged(orderId: string, userId: string, payload: {
    orderId: string;
    status: string;
    type: 'eta_set' | 'status_changed' | 'delivered';
    message?: string;
    estimatedDeliveryTime?: string;
    arrivalImageUrl?: string;
    updatedAt: string;
  }) {
    this.server.to([`order:${orderId}`, `user:${userId}`]).emit('order.status.changed', payload);
    this.logger.log(`Broadcasting order status change for order ${orderId}: ${payload.type}`);
  }

  // 新增：ETA设置事件
  broadcastOrderETASet(orderId: string, userId: string, estimatedDeliveryTime: string) {
    const payload = {
      orderId,
      type: 'eta_set' as const,
      estimatedDeliveryTime,
      message: `点好了，预计送达时间为${estimatedDeliveryTime}，我在持续跟进送达情况，请保持手机畅通`,
      updatedAt: new Date().toISOString()
    };
    this.server.to([`order:${orderId}`, `user:${userId}`]).emit('order.eta.set', payload);
    this.logger.log(`Broadcasting ETA set for order ${orderId}: ${estimatedDeliveryTime}`);
  }

  // 新增：送达事件
  broadcastOrderDelivered(orderId: string, userId: string, arrivalImageUrl?: string) {
    const message = arrivalImageUrl 
      ? "已送达，骑手已提供存放位置图片"
      : "已送达，骑手未提供存放位置图片，请在周围找找～";
      
    const payload = {
      orderId,
      type: 'delivered' as const,
      arrivalImageUrl,
      message,
      updatedAt: new Date().toISOString()
    };
    this.server.to([`order:${orderId}`, `user:${userId}`]).emit('order.delivered', payload);
    this.logger.log(`Broadcasting order delivered for order ${orderId}, hasImage: ${!!arrivalImageUrl}`);
  }
}

