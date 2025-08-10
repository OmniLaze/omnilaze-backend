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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_service_1 = require("./auth.service");
let AuthController = class AuthController {
    constructor(authService) {
        this.authService = authService;
    }
    async sendCode(body) {
        const res = await this.authService.sendVerificationCode(body.phone_number);
        return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message, data: res.data };
    }
    async login(body) {
        const res = await this.authService.loginWithPhone(body.phone_number, body.verification_code);
        if (!res.success)
            return { success: false, code: 'ERROR', message: res.message };
        const data = res.data || {};
        if (data.user_id) {
            const token = jsonwebtoken_1.default.sign({ sub: data.user_id, phone: data.phone_number, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '7d' });
            data.access_token = token;
        }
        return { success: true, code: 'OK', message: res.message, data };
    }
    async verifyInvite(body) {
        const res = await this.authService.verifyInviteAndCreate(body.phone_number, body.invite_code);
        if (!res.success)
            return { success: false, code: 'ERROR', message: res.message };
        const data = res.data || {};
        if (data.user_id) {
            const token = jsonwebtoken_1.default.sign({ sub: data.user_id, phone: data.phone_number, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '7d' });
            data.access_token = token;
        }
        return { success: true, code: 'OK', message: res.message, data };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('/send-verification-code'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendCode", null);
__decorate([
    (0, common_1.Post)('/login-with-phone'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('/verify-invite-code'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyInvite", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('/v1'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map