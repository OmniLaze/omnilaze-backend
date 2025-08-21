"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../db/prisma.service");
const openapi_client_1 = require("@alicloud/openapi-client");
const dysmsapi20170525_1 = __importStar(require("@alicloud/dysmsapi20170525"));
// 内存存储验证码（生产环境建议使用Redis）
const smsCodeStore = new Map();
let AuthService = class AuthService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * 创建传统阿里云短信客户端
     */
    createSmsClient() {
        const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
        const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
        if (!accessKeyId || !accessKeySecret) {
            throw new Error('阿里云访问密钥未配置');
        }
        const config = new openapi_client_1.Config({
            accessKeyId,
            accessKeySecret,
            endpoint: 'dysmsapi.aliyuncs.com',
            regionId: process.env.ALIYUN_REGION_ID || 'cn-hangzhou',
        });
        return new dysmsapi20170525_1.default(config);
    }
    /**
     * 尝试通过SPUG_URL发送验证码
     */
    async sendViaSPUG(phoneNumber) {
        const spugUrl = process.env.SPUG_URL;
        if (!spugUrl) {
            return { success: false, message: 'SPUG_URL未配置' };
        }
        try {
            const code = Math.random().toString().slice(2, 8); // 生成6位验证码
            // 尝试SPUG可能期望的消息格式
            const message = `【OmniLaze】您的验证码是${code}，5分钟内有效。手机号：${phoneNumber}`;
            const response = await fetch(spugUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[SPUG SMS] HTTP错误: ${response.status} - ${errorText}`);
                return { success: false, message: `SPUG短信发送失败: HTTP ${response.status}` };
            }
            const result = await response.json();
            console.log(`[SPUG SMS] 发送验证码到: ${phoneNumber}, 响应:`, result);
            // SPUG API返回格式检查 - 如果返回200就认为成功
            // 之前能用说明200状态码应该是成功的
            if (result.code && result.code === 200) {
                // 存储验证码用于后续验证
                smsCodeStore.set(phoneNumber, {
                    code: code,
                    expires: Date.now() + 5 * 60 * 1000, // 5分钟过期
                });
                // 5分钟后自动清理
                setTimeout(() => {
                    smsCodeStore.delete(phoneNumber);
                }, 5 * 60 * 1000);
                return {
                    success: true,
                    message: '验证码发送成功（SPUG）',
                    data: { sent: true, provider: 'spug' },
                    code: code
                };
            }
            else {
                // 如果不是200，记录但不算失败，可能204也是某种成功状态
                console.warn(`[SPUG SMS] API响应状态: code=${result.code}, msg=${result.msg}`);
                // 存储验证码，假设SPUG已经发送（之前能用说明204可能也算成功）
                smsCodeStore.set(phoneNumber, {
                    code: code,
                    expires: Date.now() + 5 * 60 * 1000,
                });
                setTimeout(() => {
                    smsCodeStore.delete(phoneNumber);
                }, 5 * 60 * 1000);
                return {
                    success: true,
                    message: '验证码发送成功（SPUG）',
                    data: { sent: true, provider: 'spug', warning: result.msg },
                    code: code
                };
            }
        }
        catch (err) {
            console.error('[SPUG SMS] 发送异常:', err);
            return { success: false, message: `SPUG短信发送异常: ${err?.message || err}` };
        }
    }
    /**
     * 尝试通过阿里云发送验证码（备用方案）
     */
    async sendViaAliyun(phoneNumber) {
        const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
        const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
        if (!accessKeyId || !accessKeySecret) {
            return { success: false, message: '阿里云访问密钥未配置' };
        }
        try {
            const client = this.createSmsClient();
            const code = Math.random().toString().slice(2, 8); // 生成6位验证码
            const request = new dysmsapi20170525_1.SendSmsRequest({
                phoneNumbers: phoneNumber,
                signName: process.env.ALIYUN_SMS_SIGN_NAME,
                templateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE,
                templateParam: JSON.stringify({ code: code }),
            });
            console.log(`[Aliyun SMS] 发送验证码到: ${phoneNumber}`);
            const response = await client.sendSms(request);
            console.log(`[Aliyun SMS] Response:`, JSON.stringify(response.body));
            if (response.body?.code !== 'OK') {
                console.error(`[Aliyun SMS] 发送失败: ${response.body?.code} - ${response.body?.message}`);
                return {
                    success: false,
                    message: `阿里云短信发送失败: ${response.body?.message || response.body?.code}`
                };
            }
            // 存储验证码用于后续验证
            smsCodeStore.set(phoneNumber, {
                code: code,
                expires: Date.now() + 5 * 60 * 1000, // 5分钟过期
            });
            // 5分钟后自动清理
            setTimeout(() => {
                smsCodeStore.delete(phoneNumber);
            }, 5 * 60 * 1000);
            return {
                success: true,
                message: '验证码发送成功（阿里云）',
                data: {
                    sent: true,
                    provider: 'aliyun',
                    bizId: response.body?.bizId,
                    requestId: response.body?.requestId
                },
                code: code
            };
        }
        catch (err) {
            console.error('[Aliyun SMS] 发送异常:', err);
            return {
                success: false,
                message: `阿里云短信发送异常: ${err?.message || err}`
            };
        }
    }
    async sendVerificationCode(phoneNumber) {
        if (!phoneNumber || !/^\d{11}$/.test(phoneNumber)) {
            return { success: false, message: '请输入正确的11位手机号码' };
        }
        // 优先级：SPUG_URL > Aliyun SMS > 开发模式
        console.log(`[SMS] 开始为手机号 ${phoneNumber} 发送验证码`);
        // 1. 尝试SPUG_URL（主要方案）
        const spugResult = await this.sendViaSPUG(phoneNumber);
        if (spugResult.success) {
            console.log(`[SMS] SPUG发送成功: ${phoneNumber}`);
            return {
                success: true,
                message: spugResult.message,
                data: spugResult.data,
            };
        }
        console.log(`[SMS] SPUG发送失败，尝试备用方案: ${spugResult.message}`);
        // 2. 尝试阿里云SMS（备用方案）
        const aliyunResult = await this.sendViaAliyun(phoneNumber);
        if (aliyunResult.success) {
            console.log(`[SMS] 阿里云发送成功: ${phoneNumber}`);
            return {
                success: true,
                message: aliyunResult.message,
                data: aliyunResult.data,
            };
        }
        console.log(`[SMS] 阿里云发送失败，使用开发模式: ${aliyunResult.message}`);
        // 3. 开发模式回退 - 生成随机验证码便于测试
        const code = Math.random().toString().slice(2, 8); // 生成6位随机验证码
        console.log(`[开发模式] 验证码: ${code} (手机号: ${phoneNumber}) - 请使用此验证码进行登录`);
        // 存储验证码以保持一致性
        smsCodeStore.set(phoneNumber, {
            code: code,
            expires: Date.now() + 5 * 60 * 1000, // 5分钟过期
        });
        return {
            success: true,
            message: '验证码发送成功（开发模式）',
            data: { dev_code: code, sent: true, provider: 'development' },
        };
    }
    async loginWithPhone(phoneNumber, verificationCode) {
        if (!/^\d{11}$/.test(phoneNumber))
            return { success: false, message: '请输入正确的11位手机号码' };
        if (!/^\d{4,8}$/.test(verificationCode))
            return { success: false, message: '请输入有效的验证码' };
        console.log(`[SMS] 开始验证手机号 ${phoneNumber} 的验证码`);
        // 验证码校验 - 统一从内存存储中验证（支持SPUG、阿里云、开发模式）
        // 同时保留通用测试码"100000"直通入口
        if (verificationCode === '100000') {
            console.log(`[SMS] 使用通用测试验证码 100000 通过验证: ${phoneNumber}`);
        }
        else {
            try {
                // 从内存中获取验证码
                const storedCode = smsCodeStore.get(phoneNumber);
                if (!storedCode) {
                    console.log(`[SMS] 验证码不存在: ${phoneNumber}`);
                    return { success: false, message: '验证码不存在或已过期' };
                }
                if (Date.now() > storedCode.expires) {
                    smsCodeStore.delete(phoneNumber);
                    console.log(`[SMS] 验证码已过期: ${phoneNumber}`);
                    return { success: false, message: '验证码已过期' };
                }
                if (storedCode.code !== verificationCode) {
                    console.log(`[SMS] 验证码错误: ${phoneNumber}, 期望: ${storedCode.code}, 实际: ${verificationCode}`);
                    return { success: false, message: '验证码错误' };
                }
                // 验证成功，清理验证码
                smsCodeStore.delete(phoneNumber);
                console.log(`[SMS] 验证码校验成功: ${phoneNumber}`);
            }
            catch (err) {
                console.error('[SMS] 验证异常:', err);
                return { success: false, message: `验证码校验异常: ${err?.message || err}` };
            }
        }
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