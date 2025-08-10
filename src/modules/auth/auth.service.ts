import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

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
}


