import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import OpenApi, { Config as OpenApiConfig } from '@alicloud/openapi-client';
import Dypnsapi, { GetPhoneWithTokenRequest } from '@alicloud/dypnsapi20170525';
import Util from '@alicloud/tea-util';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async sendVerificationCode(phoneNumber: string) {
    if (!phoneNumber || !/^\d{11}$/.test(phoneNumber)) {
      return { success: false, message: '请输入正确的11位手机号码' };
    }
    // TODO: integrate SMS provider (SPUG). For now, return dev code.
    const code = '100000';
    // store in DB or cache if needed
    return { success: true, message: '验证码发送成功（开发模式）', data: { dev_code: code } };
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

  // 通过阿里云 Dypnsapi 的 SpToken 换取手机号并登录/注册
  async loginWithAliyunSpToken(spToken: string) {
    if (!spToken) return { success: false, message: 'sp_token 不能为空' };

    const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
    const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
    const endpoint = process.env.ALIYUN_DYPN_ENDPOINT || 'dypnsapi.aliyuncs.com';
    const regionId = process.env.ALIYUN_REGION_ID || 'cn-hangzhou';
    const scheme = 'https';

    if (!accessKeyId || !accessKeySecret) {
      return { success: false, message: '阿里云访问密钥未配置' };
    }

    try {
      const config = new OpenApiConfig({
        accessKeyId,
        accessKeySecret,
        endpoint,
        regionId,
        protocol: scheme,
      } as any);
      const client = new Dypnsapi(config as any);

      const request = new GetPhoneWithTokenRequest({ spToken });
      const runtime = new Util.RuntimeOptions({ timeouted: 'retry', readTimeout: 5000, connectTimeout: 5000 });
      const resp = await client.getPhoneWithTokenWithOptions(request, runtime);

      const code = resp?.body?.code;
      if (code !== 'OK') {
        const msg = resp?.body?.message || '阿里云取号失败';
        return { success: false, message: `阿里云取号失败: ${msg}` };
      }

      const phoneNumber = resp?.body?.getPhoneWithTokenResultDTO?.phoneNumber || resp?.body?.phoneNumber;
      if (!phoneNumber) return { success: false, message: '未获取到手机号' };

      // 业务：若用户存在则登录；否则走新用户流程，返回需要邀请码
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
      return { success: false, message: `阿里云取号异常: ${err?.message || err}` };
    }
  }
}


