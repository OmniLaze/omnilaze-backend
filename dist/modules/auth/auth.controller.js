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
const swagger_1 = require("@nestjs/swagger");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_service_1 = require("./auth.service");
const config_service_1 = require("../../config/config.service");
const auth_dto_1 = require("./dto/auth.dto");
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
    (0, swagger_1.ApiOperation)({ summary: 'Send SMS verification code', description: 'Send verification code to user phone number' }),
    (0, swagger_1.ApiBody)({ type: auth_dto_1.SendVerificationCodeDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Verification code sent successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid phone number format' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.SendVerificationCodeDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendCode", null);
__decorate([
    (0, common_1.Post)('/login-with-phone'),
    (0, swagger_1.ApiOperation)({ summary: 'Login with phone and verification code', description: 'Authenticate user with phone number and SMS code' }),
    (0, swagger_1.ApiBody)({ type: auth_dto_1.LoginWithPhoneDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Login successful, returns JWT token' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid phone number or verification code' }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'JWT secret not configured' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.LoginWithPhoneDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('/verify-invite-code'),
    (0, swagger_1.ApiOperation)({ summary: 'Verify invite code and create account', description: 'Verify invite code and create new user account' }),
    (0, swagger_1.ApiBody)({ type: auth_dto_1.VerifyInviteCodeDto }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Account created successfully, returns JWT token' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid invite code or phone number' }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'JWT secret not configured' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.VerifyInviteCodeDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyInvite", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('Authentication'),
    (0, common_1.Controller)('/v1'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        config_service_1.ConfigService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map