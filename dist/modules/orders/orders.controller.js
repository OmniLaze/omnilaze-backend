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
exports.OrdersController = void 0;
const common_1 = require("@nestjs/common");
const orders_service_1 = require("./orders.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
let OrdersController = class OrdersController {
    constructor(orders) {
        this.orders = orders;
    }
    async create(body) {
        const res = await this.orders.createOrder(body.user_id, body.phone_number, body.form_data);
        return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message, data: res.data };
    }
    async submit(body) {
        const res = await this.orders.submitOrder(body.order_id);
        return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message, data: res.data };
    }
    async feedback(body) {
        const res = await this.orders.updateOrderFeedback(body.order_id, body.rating, body.feedback);
        return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message };
    }
    async list(userId) {
        const res = await this.orders.getUserOrders(userId);
        return { success: res.success, code: res.success ? 'OK' : 'ERROR', data: res.data, message: res.message };
    }
    async history(userId, status, page = '1', pageSize = '20') {
        const res = await this.orders.listOrders(userId, { status }, { page: Number(page), pageSize: Number(pageSize) });
        return { success: true, code: 'OK', data: res };
    }
};
exports.OrdersController = OrdersController;
__decorate([
    (0, common_1.Post)('/create-order'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('/submit-order'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "submit", null);
__decorate([
    (0, common_1.Post)('/order-feedback'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "feedback", null);
__decorate([
    (0, common_1.Get)('/orders/:userId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('/orders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Query)('user_id')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('page_size')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "history", null);
exports.OrdersController = OrdersController = __decorate([
    (0, common_1.Controller)('/v1'),
    __metadata("design:paramtypes", [orders_service_1.OrdersService])
], OrdersController);
//# sourceMappingURL=orders.controller.js.map