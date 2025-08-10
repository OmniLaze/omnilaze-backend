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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../db/prisma.service");
let AuthService = class AuthService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async sendVerificationCode(phoneNumber) {
        if (!phoneNumber || !/^\d{11}$/.test(phoneNumber)) {
            return { success: false, message: '请输入正确的11位手机号码' };
        }
        // TODO: integrate SMS provider (SPUG). For now, return dev code.
        const code = '100000';
        // store in DB or cache if needed
        return { success: true, message: '验证码发送成功（开发模式）', data: { dev_code: code } };
    }
    async loginWithPhone(phoneNumber, verificationCode) {
        if (!/^\d{11}$/.test(phoneNumber))
            return { success: false, message: '请输入正确的11位手机号码' };
        if (!/^\d{6}$/.test(verificationCode))
            return { success: false, message: '请输入6位数字验证码' };
        // dev code only
        if (verificationCode !== '100000')
            return { success: false, message: '验证码错误' };
        // check user
        const user = await this.prisma.user.findUnique({ where: { phoneNumber } });
        if (!user) {
            return {
                success: true,
                message: '新用户验证成功，请输入邀请码',
                data: { user_id: null, phone_number: phoneNumber, is_new_user: true },
            };
        }
        return {
            success: true,
            message: '验证成功',
            data: {
                user_id: user.id,
                phone_number: user.phoneNumber,
                is_new_user: false,
                user_sequence: user.userSequence || undefined,
            },
        };
    }
    async verifyInviteAndCreate(phoneNumber, inviteCode) {
        if (!/^\d{11}$/.test(phoneNumber))
            return { success: false, message: '请输入正确的11位手机号码' };
        if (!inviteCode)
            return { success: false, message: '邀请码不能为空' };
        const code = await this.prisma.inviteCode.findUnique({ where: { code: inviteCode } });
        if (!code || code.currentUses >= code.maxUses)
            return { success: false, message: '邀请码无效或已达到使用次数限制' };
        // create user
        const user = await this.prisma.user.create({
            data: {
                phoneNumber,
                inviteCode,
                userInviteCode: `USR${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
            },
        });
        // update invite code usage
        await this.prisma.inviteCode.update({
            where: { code: inviteCode },
            data: { currentUses: { increment: 1 }, usedBy: phoneNumber, usedAt: new Date() },
        });
        return {
            success: true,
            message: '新用户注册成功',
            data: {
                user_id: user.id,
                phone_number: user.phoneNumber,
                user_sequence: user.userSequence || undefined,
                user_invite_code: user.userInviteCode || undefined,
            },
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuthService);
//# sourceMappingURL=auth.service.js.map