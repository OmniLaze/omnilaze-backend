"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_module_1 = require("./config/config.module");
const health_module_1 = require("./modules/health/health.module");
const prisma_module_1 = require("./db/prisma.module");
const orders_module_1 = require("./modules/orders/orders.module");
const auth_module_1 = require("./modules/auth/auth.module");
const preferences_module_1 = require("./modules/preferences/preferences.module");
const invites_module_1 = require("./modules/invites/invites.module");
const payments_module_1 = require("./modules/payments/payments.module");
const app_controller_1 = require("./app.controller");
const admin_module_1 = require("./modules/admin/admin.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_module_1.ConfigModule,
            prisma_module_1.PrismaModule,
            health_module_1.HealthModule,
            auth_module_1.AuthModule,
            orders_module_1.OrdersModule,
            preferences_module_1.PreferencesModule,
            invites_module_1.InvitesModule,
            payments_module_1.PaymentsModule,
            admin_module_1.AdminModule,
        ],
        controllers: [app_controller_1.AppController],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map