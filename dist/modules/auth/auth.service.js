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
const dypnsapi20170525_1 = __importStar(require("@alicloud/dypnsapi20170525"));
const tea_util_1 = require("@alicloud/tea-util");
let AuthService = class AuthService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * 创建阿里云Dypnsapi客户端
     */
    createDypnsapiClient() {
        const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
        const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
        if (!accessKeyId || !accessKeySecret) {
            throw new Error('阿里云访问密钥未配置');
        }
        // 使用传统方式初始化（兼容性更好）
        const config = new openapi_client_1.Config({
            accessKeyId,
            accessKeySecret,
            endpoint: process.env.ALIYUN_DYPN_ENDPOINT || 'dypnsapi.aliyuncs.com',
            regionId: process.env.ALIYUN_REGION_ID || 'cn-hangzhou',
        });
        return new dypnsapi20170525_1.default(config);
    }
    async sendVerificationCode(phoneNumber) {
        if (!phoneNumber || !/^\d{11}$/.test(phoneNumber)) {
            return { success: false, message: '请输入正确的11位手机号码' };
        }
        const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
        const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
        // 开发环境回退处理
        if (!accessKeyId || !accessKeySecret) {
            const code = '100000';
            console.log(`[开发模式] 验证码: ${code} (手机号: ${phoneNumber})`);
            return {
                success: true,
                message: '验证码发送成功（开发模式）',
                data: { dev_code: code, sent: true },
            };
        }
        try {
            const client = this.createDypnsapiClient();
            const runtime = new tea_util_1.RuntimeOptions({});
            const request = new dypnsapi20170525_1.SendSmsVerifyCodeRequest({
                phoneNumber,
                countryCode: '86',
                signName: process.env.ALIYUN_SMS_SIGN_NAME,
                templateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE,
                templateParam: JSON.stringify({ code: '##code##' }),
                validTime: 300,
                interval: 60,
                codeLength: 6,
                codeType: 1,
                duplicatePolicy: 1,
                schemeName: process.env.ALIYUN_SMS_SCHEME_NAME || 'OmniLaze',
                returnVerifyCode: process.env.NODE_ENV !== 'production',
            });
            console.log(`[Aliyun SMS] 发送验证码到: ${phoneNumber}`);
            const response = await client.sendSmsVerifyCodeWithOptions(request, runtime);
            console.log(`[Aliyun SMS] Response:`, JSON.stringify(response.body));
            if (response.body?.code !== 'OK') {
                console.error(`[Aliyun SMS] 发送失败: ${response.body?.code} - ${response.body?.message}`);
                return {
                    success: false,
                    message: `短信发送失败: ${response.body?.message || response.body?.code}`
                };
            }
            const verifyCode = response.body?.model?.verifyCode;
            if (verifyCode) {
                console.log(`[Aliyun SMS] 开发模式验证码: ${verifyCode}`);
            }
            return {
                success: true,
                message: '验证码发送成功',
                data: {
                    sent: true,
                    dev_code: verifyCode,
                    bizId: response.body?.model?.bizId,
                    requestId: response.body?.requestId
                },
            };
        }
        catch (err) {
            console.error('[Aliyun SMS] 发送异常:', err);
            return {
                success: false,
                message: `短信发送异常: ${err?.message || err}`
            };
        }
    }
    async loginWithPhone(phoneNumber, verificationCode) {
        if (!/^\d{11}$/.test(phoneNumber))
            return { success: false, message: '请输入正确的11位手机号码' };
        if (!/^\d{4,8}$/.test(verificationCode))
            return { success: false, message: '请输入有效的验证码' };
        const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
        const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
        // 验证码校验
        if (accessKeyId && accessKeySecret) {
            try {
                const client = this.createDypnsapiClient();
                const runtime = new tea_util_1.RuntimeOptions({});
                const request = new dypnsapi20170525_1.CheckSmsVerifyCodeRequest({
                    phoneNumber,
                    verifyCode: verificationCode,
                    caseAuthPolicy: 1,
                    schemeName: process.env.ALIYUN_SMS_SCHEME_NAME || 'OmniLaze',
                });
                console.log(`[Aliyun SMS] 验证验证码: ${phoneNumber} - ${verificationCode}`);
                const response = await client.checkSmsVerifyCodeWithOptions(request, runtime);
                console.log(`[Aliyun SMS] 验证响应:`, JSON.stringify(response.body));
                const code = response?.body?.code;
                const success = response?.body?.success;
                if (code !== 'OK' || !success) {
                    const message = response?.body?.message || '验证码校验失败';
                    console.error(`[Aliyun SMS] 验证失败: ${code} - ${message}`);
                    return { success: false, message };
                }
                console.log(`[Aliyun SMS] 验证码校验成功`);
            }
            catch (err) {
                console.error('[Aliyun SMS] 验证异常:', err);
                return { success: false, message: `验证码校验异常: ${err?.message || err}` };
            }
        }
        else {
            // 开发模式回退
            console.log(`[开发模式] 验证验证码: ${verificationCode}`);
            if (verificationCode !== '100000') {
                return { success: false, message: '验证码错误' };
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
    // 获取阿里云授权Token（一键登录第一步）
    async getAliyunAuthToken() {
        const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
        const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
        const endpoint = process.env.ALIYUN_DYPN_ENDPOINT || 'dypnsapi.aliyuncs.com';
        const regionId = process.env.ALIYUN_REGION_ID || 'cn-hangzhou';
        if (!accessKeyId || !accessKeySecret) {
            return { success: false, message: '阿里云访问密钥未配置' };
        }
        try {
            const config = new openapi_client_1.Config({
                accessKeyId,
                accessKeySecret,
                endpoint,
                regionId,
                protocol: 'https',
            });
            const client = new dypnsapi20170525_1.default(config);
            const request = new dypnsapi20170525_1.GetAuthTokenRequest({
                origin: process.env.ALIYUN_ORIGIN || 'https://backend.omnilaze.co',
                sceneCode: process.env.ALIYUN_SCENE_CODE || 'FC100000037867893',
                url: process.env.ALIYUN_CALLBACK_URL || 'https://backend.omnilaze.co/v1/aliyun-callback',
            });
            const runtime = new tea_util_1.RuntimeOptions({});
            const response = await client.getAuthTokenWithOptions(request, runtime);
            if (response?.body?.code !== 'OK') {
                const msg = response?.body?.message || '获取授权Token失败';
                return { success: false, message: `阿里云授权失败: ${msg}` };
            }
            return {
                success: true,
                message: '获取授权Token成功',
                data: {
                    authToken: response.body.tokenResult?.jwtToken,
                    requestId: response.body.requestId,
                }
            };
        }
        catch (err) {
            console.error('Aliyun GetAuthToken error:', err);
            return { success: false, message: `阿里云授权异常: ${err?.message || err}` };
        }
    }
    // 通过阿里云 Dypnsapi 的 SpToken 换取手机号并登录/注册（修复版本）
    async loginWithAliyunSpToken(spToken) {
        if (!spToken)
            return { success: false, message: 'sp_token 不能为空' };
        const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
        const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
        const endpoint = process.env.ALIYUN_DYPN_ENDPOINT || 'dypnsapi.aliyuncs.com';
        const regionId = process.env.ALIYUN_REGION_ID || 'cn-hangzhou';
        if (!accessKeyId || !accessKeySecret) {
            return { success: false, message: '阿里云访问密钥未配置' };
        }
        try {
            const config = new openapi_client_1.Config({
                accessKeyId,
                accessKeySecret,
                endpoint,
                regionId,
                protocol: 'https',
            });
            const client = new dypnsapi20170525_1.default(config);
            // 使用GetPhoneWithToken API
            const request = new dypnsapi20170525_1.GetPhoneWithTokenRequest({
                spToken: spToken
            });
            const runtime = new tea_util_1.RuntimeOptions({});
            console.log(`[Aliyun] Requesting phone with spToken: ${spToken.substring(0, 20)}...`);
            const resp = await client.getPhoneWithTokenWithOptions(request, runtime);
            console.log(`[Aliyun] Response code: ${resp?.body?.code}, message: ${resp?.body?.message}`);
            const code = resp?.body?.code;
            if (code !== 'OK') {
                const msg = resp?.body?.message || '阿里云取号失败';
                console.error(`[Aliyun] Error response:`, resp?.body);
                return { success: false, code: code || 'ERROR', message: `阿里云取号异常: ${code}: ${msg}` };
            }
            // 尝试多种可能的手机号字段
            const phoneNumber = resp?.body?.phoneNumber ||
                resp?.body?.getPhoneWithTokenResultDTO?.phoneNumber ||
                resp?.body?.data?.phoneNumber ||
                resp?.body?.result?.phoneNumber;
            console.log(`[Aliyun] Extracted phone number: ${phoneNumber}`);
            if (!phoneNumber) {
                console.error(`[Aliyun] No phone number in response:`, JSON.stringify(resp?.body, null, 2));
                return { success: false, message: '未能从响应中获取到手机号' };
            }
            // 验证手机号格式
            if (!/^1[3-9]\d{9}$/.test(phoneNumber)) {
                return { success: false, message: `获取到的手机号格式不正确: ${phoneNumber}` };
            }
            // 业务逻辑：检查用户是否存在
            const existing = await this.prisma.user.findUnique({ where: { phoneNumber } });
            if (!existing) {
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
                    user_id: existing.id,
                    phone_number: existing.phoneNumber,
                    is_new_user: false,
                    user_sequence: existing.userSequence || undefined,
                },
            };
        }
        catch (err) {
            console.error('[Aliyun] Exception:', err);
            return { success: false, message: `阿里云取号异常: ${err?.message || err}` };
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuthService);
//# sourceMappingURL=auth.service.js.map