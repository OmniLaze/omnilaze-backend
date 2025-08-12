import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import OpenApi, { Config as OpenApiConfig } from '@alicloud/openapi-client';
import Dysmsapi, { SendSmsRequest } from '@alicloud/dysmsapi20170525';

// 内存存储验证码（生产环境建议使用Redis）
const smsCodeStore = new Map<string, { code: string; expires: number }>();

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建传统阿里云短信客户端
   */
  private createSmsClient(): Dysmsapi {
    const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
    const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
    
    if (!accessKeyId || !accessKeySecret) {
      throw new Error('阿里云访问密钥未配置');
    }

    const config = new OpenApiConfig({
      accessKeyId,
      accessKeySecret,
      endpoint: 'dysmsapi.aliyuncs.com',
      regionId: process.env.ALIYUN_REGION_ID || 'cn-hangzhou',
    });
    
    return new Dysmsapi(config);
  }

  async sendVerificationCode(phoneNumber: string) {
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
      const client = this.createSmsClient();
      const code = Math.random().toString().slice(2, 8); // 生成6位验证码
      
      const request = new SendSmsRequest({
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
          message: `短信发送失败: ${response.body?.message || response.body?.code}` 
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
        message: '验证码发送成功',
        data: { 
          sent: true, 
          bizId: response.body?.bizId,
          requestId: response.body?.requestId
        },
      };
    } catch (err: any) {
      console.error('[Aliyun SMS] 发送异常:', err);
      return { 
        success: false, 
        message: `短信发送异常: ${err?.message || err}` 
      };
    }
  }

  async loginWithPhone(phoneNumber: string, verificationCode: string) {
    if (!/^\d{11}$/.test(phoneNumber)) return { success: false, message: '请输入正确的11位手机号码' };
    if (!/^\d{4,8}$/.test(verificationCode)) return { success: false, message: '请输入有效的验证码' };

    const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
    const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;

    // 验证码校验
    if (accessKeyId && accessKeySecret) {
      try {
        // 从内存中获取验证码
        const storedCode = smsCodeStore.get(phoneNumber);
        
        if (!storedCode) {
          return { success: false, message: '验证码不存在或已过期' };
        }
        
        if (Date.now() > storedCode.expires) {
          smsCodeStore.delete(phoneNumber);
          return { success: false, message: '验证码已过期' };
        }
        
        if (storedCode.code !== verificationCode) {
          return { success: false, message: '验证码错误' };
        }
        
        // 验证成功，清理验证码
        smsCodeStore.delete(phoneNumber);
        console.log(`[Aliyun SMS] 验证码校验成功: ${phoneNumber}`);
        
      } catch (err: any) {
        console.error('[Aliyun SMS] 验证异常:', err);
        return { success: false, message: `验证码校验异常: ${err?.message || err}` };
      }
    } else {
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
}