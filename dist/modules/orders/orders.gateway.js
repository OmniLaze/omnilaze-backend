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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
let OrdersGateway = class OrdersGateway {
    handleSubscribeUser(data, client) {
        if (data?.userId)
            client.join(`user:${data.userId}`);
        return { ok: true };
    }
    handleSubscribeOrder(data, client) {
        if (data?.orderId)
            client.join(`order:${data.orderId}`);
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
    __metadata("design:returntype", void 0)
], OrdersGateway.prototype, "handleSubscribeOrder", null);
exports.OrdersGateway = OrdersGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({ namespace: '/ws', cors: { origin: '*' } })
], OrdersGateway);
//# sourceMappingURL=orders.gateway.js.map