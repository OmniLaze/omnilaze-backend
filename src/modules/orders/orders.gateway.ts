import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UnauthorizedException, Logger } from '@nestjs/common';
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
}

