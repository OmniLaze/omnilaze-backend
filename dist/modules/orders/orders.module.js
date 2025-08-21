"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersModule = void 0;
const common_1 = require("@nestjs/common");
const orders_controller_1 = require("./orders.controller");
const orders_service_1 = require("./orders.service");
const orders_gateway_1 = require("./orders.gateway");
const config_module_1 = require("../../config/config.module");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const system_key_guard_1 = require("../../common/guards/system-key.guard");
const admin_guard_1 = require("../../common/guards/admin.guard");
const admin_or_system_key_guard_1 = require("../../common/guards/admin-or-system-key.guard");
let OrdersModule = class OrdersModule {
};
exports.OrdersModule = OrdersModule;
exports.OrdersModule = OrdersModule = __decorate([
    (0, common_1.Module)({
        imports: [config_module_1.ConfigModule],
        controllers: [orders_controller_1.OrdersController],
        providers: [orders_service_1.OrdersService, orders_gateway_1.OrdersGateway, jwt_auth_guard_1.JwtAuthGuard, system_key_guard_1.SystemKeyGuard, admin_guard_1.AdminGuard, admin_or_system_key_guard_1.AdminOrSystemKeyGuard],
        exports: [orders_service_1.OrdersService],
    })
], OrdersModule);
//# sourceMappingURL=orders.module.js.map