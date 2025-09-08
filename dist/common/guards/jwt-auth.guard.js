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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_service_1 = require("../../config/config.service");
let JwtAuthGuard = class JwtAuthGuard {
    constructor(config) {
        this.config = config;
    }
    canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const auth = req.headers['authorization'];
        if (!auth || !auth.startsWith('Bearer '))
            throw new common_1.UnauthorizedException('Missing token');
        const token = auth.slice(7);
        // 开发模式下支持模拟token
        if (process.env.NODE_ENV === 'development' && token.startsWith('dev_token_')) {
            const userId = token.replace('dev_token_', '');
            console.log(`🔧 开发模式：接受模拟token，用户ID: ${userId}`);
            req.user = {
                sub: userId,
                phone: '13066905418', // 使用开发模式默认手机号
                role: 'user'
            };
            return true;
        }
        try {
            const secret = process.env.JWT_SECRET || this.config.jwtSecret || '';
            if (!secret) {
                console.error('[Auth] JWT_SECRET is missing; cannot verify token');
                throw new common_1.InternalServerErrorException('服务器配置缺失：JWT_SECRET 未设置');
            }
            const payload = jsonwebtoken_1.default.verify(token, secret);
            req.user = payload;
            return true;
        }
        catch (e) {
            if (e instanceof common_1.InternalServerErrorException)
                throw e;
            throw new common_1.UnauthorizedException('Invalid token');
        }
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_service_1.ConfigService])
], JwtAuthGuard);
//# sourceMappingURL=jwt-auth.guard.js.map