"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsModule = void 0;
const common_1 = require("@nestjs/common");
const payments_controller_1 = require("./payments.controller");
const alipay_gateway_controller_1 = require("./alipay.gateway.controller");
const payments_service_1 = require("./payments.service");
const alipay_provider_1 = require("./providers/alipay.provider");
const wechatpay_provider_1 = require("./providers/wechatpay.provider");
const config_module_1 = require("../../config/config.module");
const prisma_module_1 = require("../../db/prisma.module");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const notifications_module_1 = require("../notifications/notifications.module");
let PaymentsModule = class PaymentsModule {
};
exports.PaymentsModule = PaymentsModule;
exports.PaymentsModule = PaymentsModule = __decorate([
    (0, common_1.Module)({
        imports: [config_module_1.ConfigModule, prisma_module_1.PrismaModule, notifications_module_1.NotificationsModule],
        controllers: [payments_controller_1.PaymentsController, alipay_gateway_controller_1.AlipayGatewayController],
        providers: [payments_service_1.PaymentsService, alipay_provider_1.AlipayProvider, wechatpay_provider_1.WechatPayProvider, jwt_auth_guard_1.JwtAuthGuard],
        exports: [payments_service_1.PaymentsService],
    })
], PaymentsModule);
//# sourceMappingURL=payments.module.js.map