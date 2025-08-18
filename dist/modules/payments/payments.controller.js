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
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const payments_service_1 = require("./payments.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let PaymentsController = class PaymentsController {
    constructor(payments) {
        this.payments = payments;
    }
    async create(userId, body) {
        const res = await this.payments.createPayment(body.order_id, body.provider, body.amount, body.idempotency_key, userId, body.payment_method);
        return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message, data: res.data };
    }
    async get(paymentId) {
        const res = await this.payments.getPayment(paymentId);
        return { success: !!res, code: res ? 'OK' : 'NOT_FOUND', data: res };
    }
    async alipayWebhook(req, res) {
        const ok = await this.payments.handleAlipayWebhook(req);
        // Alipay expects 'success' to acknowledge
        return res.status(200).send(ok ? 'success' : 'failure');
    }
    async wechatPayWebhook(req, res) {
        const ok = await this.payments.handleWechatPayWebhook(req);
        // WeChat Pay expects specific response format
        if (ok) {
            return res.status(200).json({ code: 'SUCCESS', message: '成功' });
        }
        else {
            return res.status(400).json({ code: 'FAIL', message: '失败' });
        }
    }
    async queryStatus(userId, paymentId) {
        const res = await this.payments.queryPaymentStatus(paymentId, userId);
        return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message, data: res.data };
    }
    async refund(userId, paymentId, body) {
        const res = await this.payments.refundPayment(paymentId, body.amount, body.reason, userId);
        return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message, data: res.data };
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.Post)('/create'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('/:paymentId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('paymentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "get", null);
__decorate([
    (0, common_1.Post)('/webhook/alipay'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "alipayWebhook", null);
__decorate([
    (0, common_1.Post)('/webhook/wechatpay'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "wechatPayWebhook", null);
__decorate([
    (0, common_1.Get)('/:paymentId/status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Param)('paymentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "queryStatus", null);
__decorate([
    (0, common_1.Post)('/:paymentId/refund'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Param)('paymentId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "refund", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, common_1.Controller)('/v1/payments'),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService])
], PaymentsController);
//# sourceMappingURL=payments.controller.js.map