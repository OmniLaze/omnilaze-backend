import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import OpenApi, { Config as OpenApiConfig } from '@alicloud/openapi-client';
import Dypnsapi, { GetPhoneWithTokenRequest, GetAuthTokenRequest } from '@alicloud/dypnsapi20170525';
import Util, { RuntimeOptions } from '@alicloud/tea-util';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async sendVerificationCode(phoneNumber: string) {
    if (!phoneNumber || !/^\d{11}$/.test(phoneNumber)) {
      return { success: false, message: '请输入正确的11位手机号码' };
    }

    // 生产环境发送真实短信
    if (process.env.NODE_ENV === 'production' && process.env.SPUG_URL) {
      try {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        // 发送短信到SPUG接口
        const response = await fetch(process.env.SPUG_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: phoneNumber,
            code: code,
            message: `您的验证码是：${code}，5分钟内有效。请勿泄露给他人。`
          })
        });

        if (!response.ok) {
          throw new Error(`SMS service returned ${response.status}`);
        }

        // 存储验证码到数据库或缓存（这里暂时简化）
        return { 
          success: true, 
          message: '验证码发送成功', 
          data: { sent: true } 
        };
      } catch (error) {
        console.error('SMS sending failed:', error);
        return { 
          success: false, 
          message: '短信发送失败，请稍后重试' 
        };
      }
    }

    // 开发环境返回固定验证码
    const code = '100000';
    return { 
      success: true, 
      message: '验证码发送成功（开发模式）', 
      data: { dev_code: code, sent: true } 
    };
  }

  async loginWithPhone(phoneNumber: string, verificationCode: string) {
    if (!/^\d{11}$/.test(phoneNumber)) return { success: false, message: '请输入正确的11位手机号码' };
    if (!/^\d{6}$/.test(verificationCode)) return { success: false, message: '请输入6位数字验证码' };

    // dev code only
    if (verificationCode !== '100000') return { success: false, message: '验证码错误' };

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

  async verifyInviteAndCreate(phoneNumber: string, inviteCode: string) {
    if (!/^\d{11}$/.test(phoneNumber)) return { success: false, message: '请输入正确的11位手机号码' };
    if (!inviteCode) return { success: false, message: '邀请码不能为空' };

    const code = await this.prisma.inviteCode.findUnique({ where: { code: inviteCode } });
    if (!code || code.currentUses >= code.maxUses) return { success: false, message: '邀请码无效或已达到使用次数限制' };

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
      const config = new OpenApiConfig({
        accessKeyId,
        accessKeySecret,
        endpoint,
        regionId,
        protocol: 'https',
      } as any);
      const client = new Dypnsapi(config as any);
      
      const request = new GetAuthTokenRequest({
        origin: process.env.ALIYUN_ORIGIN || 'https://backend.omnilaze.co', 
        sceneCode: process.env.ALIYUN_SCENE_CODE || 'FC100000037867893', 
        url: process.env.ALIYUN_CALLBACK_URL || 'https://backend.omnilaze.co/v1/aliyun-callback',
      });
      
      const runtime = new RuntimeOptions({});
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
    } catch (err: any) {
      console.error('Aliyun GetAuthToken error:', err);
      return { success: false, message: `阿里云授权异常: ${err?.message || err}` };
    }
  }

  // 通过阿里云 Dypnsapi 的 SpToken 换取手机号并登录/注册（修复版本）
  async loginWithAliyunSpToken(spToken: string) {
    if (!spToken) return { success: false, message: 'sp_token 不能为空' };

    const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
    const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
    const endpoint = process.env.ALIYUN_DYPN_ENDPOINT || 'dypnsapi.aliyuncs.com';
    const regionId = process.env.ALIYUN_REGION_ID || 'cn-hangzhou';

    if (!accessKeyId || !accessKeySecret) {
      return { success: false, message: '阿里云访问密钥未配置' };
    }

    try {
      const config = new OpenApiConfig({
        accessKeyId,
        accessKeySecret,
        endpoint,
        regionId,
        protocol: 'https',
      } as any);
      const client = new Dypnsapi(config as any);

      // 使用GetPhoneWithToken API
      const request = new GetPhoneWithTokenRequest({ 
        spToken: spToken 
      });
      const runtime = new RuntimeOptions({});
      
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
    } catch (err: any) {
      console.error('[Aliyun] Exception:', err);
      return { success: false, message: `阿里云取号异常: ${err?.message || err}` };
    }
  }
}


