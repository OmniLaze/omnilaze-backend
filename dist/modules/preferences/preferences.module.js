"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreferencesModule = void 0;
const common_1 = require("@nestjs/common");
const preferences_controller_1 = require("./preferences.controller");
const preferences_service_1 = require("./preferences.service");
const config_module_1 = require("../../config/config.module");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
let PreferencesModule = class PreferencesModule {
};
exports.PreferencesModule = PreferencesModule;
exports.PreferencesModule = PreferencesModule = __decorate([
    (0, common_1.Module)({
        imports: [config_module_1.ConfigModule],
        controllers: [preferences_controller_1.PreferencesController],
        providers: [preferences_service_1.PreferencesService, jwt_auth_guard_1.JwtAuthGuard],
    })
], PreferencesModule);
//# sourceMappingURL=preferences.module.js.map