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
const config_service_1 = require("../../config/config.service");
let AuthController = class AuthController {
    constructor(authService, config) {
        this.authService = authService;
        this.config = config;
    }
    async sendCode(body) {
        const res = await this.authService.sendVerificationCode(body.phone_number);
        return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message, data: res.data };
    }
    async login(body) {
        console.log('[Auth] /v1/login-with-phone called');
        const res = await this.authService.loginWithPhone(body.phone_number, body.verification_code);
        if (!res.success)
            return { success: false, code: 'ERROR', message: res.message };
        const data = res.data || {};
        if (data.user_id) {
            const secret = process.env.JWT_SECRET || this.config.jwtSecret || '';
            if (!secret) {
                console.error('[Auth] JWT_SECRET is missing; cannot issue token');
                throw new common_1.HttpException('服务器配置缺失：JWT_SECRET 未设置', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
            const token = jsonwebtoken_1.default.sign({ sub: data.user_id, phone: data.phone_number, role: 'user' }, secret, { expiresIn: '7d' });
            data.access_token = token;
            console.log('[Auth] Issued JWT (len):', token.length);
        }
        return { success: true, code: 'OK', message: res.message, data };
    }
    // 阿里云获取授权Token（一键登录第一步）
    async getAliyunAuthToken() {
        const res = await this.authService.getAliyunAuthToken();
        if (!res.success)
            return { success: false, code: 'ERROR', message: res.message };
        return { success: true, code: 'OK', message: res.message, data: res.data };
    }
    // 阿里云 Dypnsapi - 通过 SpToken 获取手机号并登录/注册
    async loginWithAliyun(body) {
        console.log('[Auth] /v1/login-with-aliyun-sp-token called');
        const res = await this.authService.loginWithAliyunSpToken(body.sp_token);
        if (!res.success)
            return { success: false, code: 'ERROR', message: res.message };
        const data = res.data || {};
        if (data.user_id) {
            const secret = process.env.JWT_SECRET || this.config.jwtSecret || '';
            if (!secret) {
                console.error('[Auth] JWT_SECRET is missing; cannot issue token');
                throw new common_1.HttpException('服务器配置缺失：JWT_SECRET 未设置', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
            const token = jsonwebtoken_1.default.sign({ sub: data.user_id, phone: data.phone_number, role: 'user' }, secret, { expiresIn: '7d' });
            data.access_token = token;
            console.log('[Auth] Issued JWT (len):', token.length);
        }
        return { success: true, code: 'OK', message: res.message, data };
    }
    async verifyInvite(body) {
        const res = await this.authService.verifyInviteAndCreate(body.phone_number, body.invite_code);
        if (!res.success)
            return { success: false, code: 'ERROR', message: res.message };
        const data = res.data || {};
        if (data.user_id) {
            const secret = process.env.JWT_SECRET || this.config.jwtSecret || '';
            if (!secret) {
                console.error('[Auth] JWT_SECRET is missing; cannot issue token');
                throw new common_1.HttpException('服务器配置缺失：JWT_SECRET 未设置', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
            const token = jsonwebtoken_1.default.sign({ sub: data.user_id, phone: data.phone_number, role: 'user' }, secret, { expiresIn: '7d' });
            data.access_token = token;
            console.log('[Auth] Issued JWT (len):', token.length);
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
    (0, common_1.Post)('/get-aliyun-auth-token'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getAliyunAuthToken", null);
__decorate([
    (0, common_1.Post)('/login-with-aliyun-sp-token'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "loginWithAliyun", null);
__decorate([
    (0, common_1.Post)('/verify-invite-code'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyInvite", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('/v1'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        config_service_1.ConfigService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map