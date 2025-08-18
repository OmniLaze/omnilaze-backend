"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var OrdersGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_service_1 = require("../../config/config.service");
const prisma_service_1 = require("../../db/prisma.service");
let OrdersGateway = OrdersGateway_1 = class OrdersGateway {
    constructor(configService, prisma) {
        this.configService = configService;
        this.prisma = prisma;
        this.logger = new common_1.Logger(OrdersGateway_1.name);
        this.authenticatedClients = new Map();
    }
    async handleConnection(client) {
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
            const payload = jsonwebtoken_1.default.verify(token, secret);
            // Store authenticated user info
            this.authenticatedClients.set(client.id, payload);
            this.logger.log(`Client ${client.id} connected as user ${payload.sub}`);
        }
        catch (error) {
            this.logger.error(`Authentication failed for client ${client.id}: ${error}`);
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        this.authenticatedClients.delete(client.id);
        this.logger.log(`Client ${client.id} disconnected`);
    }
    handleSubscribeUser(data, client) {
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
    async handleSubscribeOrder(data, client) {
        const userInfo = this.authenticatedClients.get(client.id);
        if (!userInfo) {
            return { ok: false, error: 'Unauthorized' };
        }
        try {
            if (!data?.orderId)
                return { ok: false, error: 'Missing orderId' };
            const order = await this.prisma.order.findUnique({ where: { id: data.orderId }, select: { userId: true } });
            if (!order)
                return { ok: false, error: 'Order not found' };
            if (order.userId !== userInfo.sub)
                return { ok: false, error: 'Forbidden: Cannot subscribe to other users order' };
            client.join(`order:${data.orderId}`);
            this.logger.log(`User ${userInfo.sub} subscribed to order ${data.orderId}`);
        }
        catch (e) {
            this.logger.error('subscribe.order failed', e);
            return { ok: false, error: 'Internal error' };
        }
        return { ok: true };
    }
    broadcastOrderUpdated(orderId, userId, payload) {
        this.server.to([`order:${orderId}`, `user:${userId}`]).emit('order.updated', payload);
    }
    broadcastPaymentUpdated(orderId, userId, payload) {
        this.server.to([`order:${orderId}`, `user:${userId}`]).emit('payment.updated', payload);
    }
};
exports.OrdersGateway = OrdersGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], OrdersGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe.user'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], OrdersGateway.prototype, "handleSubscribeUser", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe.order'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], OrdersGateway.prototype, "handleSubscribeOrder", null);
exports.OrdersGateway = OrdersGateway = OrdersGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: '/ws',
        cors: {
            origin: process.env.CORS_ORIGINS ? JSON.parse(process.env.CORS_ORIGINS) : ['http://localhost:3000'],
            credentials: true
        }
    }),
    __metadata("design:paramtypes", [config_service_1.ConfigService, prisma_service_1.PrismaService])
], OrdersGateway);
//# sourceMappingURL=orders.gateway.js.map