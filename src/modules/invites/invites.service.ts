import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

@Injectable()
export class InvitesService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserInviteStats(userId: string) {
    if (!userId) return { success: false, message: '用户ID不能为空' };
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.userInviteCode) return { success: false, message: '用户邀请码不存在' };
    const code = await this.prisma.inviteCode.findUnique({ where: { code: user.userInviteCode } });
    const current = code?.currentUses || 0;
    const max = code?.maxUses || 2;
    const eligible = current >= max;
    const freeOrder = await this.prisma.order.findFirst({ where: { userId, budgetAmount: 0 } }).catch(() => null);
    return {
      success: true,
      user_invite_code: user.userInviteCode,
      current_uses: current,
      max_uses: max,
      remaining_uses: Math.max(0, max - current),
      eligible_for_free_drink: eligible,
      free_drink_claimed: !!freeOrder,
      free_drinks_remaining: null,
    };
  }

  async getInviteProgress(userId: string) {
    if (!userId) return { success: false, message: '用户ID不能为空' };
    const items = await this.prisma.invitation.findMany({ where: { inviterUserId: userId }, orderBy: { invitedAt: 'desc' } });
    const invitations = items.map((x) => ({ phone_number: x.inviteePhone, invited_at: x.invitedAt.toISOString(), masked_phone: x.inviteePhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') }));
    return { success: true, invitations, total_invitations: invitations.length };
  }

  async claimFreeDrink(userId: string) {
    if (!userId) return { success: false, message: '用户ID不能为空' };
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, message: '用户不存在' };
    const code = await this.prisma.inviteCode.findUnique({ where: { code: user.userInviteCode || '' } });
    if (!code || code.currentUses < code.maxUses) return { success: false, message: '邀请人数不足，无法领取免单' };
    const existing = await this.prisma.order.findFirst({ where: { userId, budgetAmount: 0 } });
    if (existing) return { success: false, message: '您已经领取过免单奶茶' };
    const order = await this.prisma.order.create({
      data: {
        orderNumber: `FREE${Date.now()}`,
        userId,
        phoneNumber: user.phoneNumber,
        status: 'completed',
        orderDate: new Date(),
        deliveryAddress: '',
        dietaryRestrictions: '[]',
        foodPreferences: '[]',
        budgetAmount: 0,
        budgetCurrency: 'CNY',
        metadata: { isFreeOrder: true, claimedAt: new Date().toISOString(), orderType: 'drink' },
      },
    });
    return { success: true, message: '免单领取成功！', free_order_id: order.id };
  }

  async freeDrinksRemaining() {
    // Optional: Implement global quota logic with a config table
    return { success: true, free_drinks_remaining: null, message: '未配置全局免单名额' };
  }

  // 管理员方法
  async getAllInviteCodes() {
    try {
      const codes = await this.prisma.inviteCode.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return {
        success: true,
        data: codes.map(code => ({
          code: code.code,
          max_uses: code.maxUses,
          current_uses: code.currentUses,
          remaining_uses: code.maxUses - code.currentUses,
          created_at: code.createdAt,
          used_by: code.usedBy,
          used_at: code.usedAt
        }))
      };
    } catch (error) {
      return { success: false, message: '获取邀请码失败' };
    }
  }

  async updateInviteCodeMaxUses(code: string, maxUses: number) {
    try {
      if (!code || maxUses < 0) {
        return { success: false, message: '参数无效' };
      }

      const existing = await this.prisma.inviteCode.findUnique({
        where: { code }
      });

      if (!existing) {
        return { success: false, message: '邀请码不存在' };
      }

      const updated = await this.prisma.inviteCode.update({
        where: { code },
        data: { maxUses }
      });

      return {
        success: true,
        message: '邀请码更新成功',
        data: {
          code: updated.code,
          max_uses: updated.maxUses,
          current_uses: updated.currentUses,
          remaining_uses: updated.maxUses - updated.currentUses
        }
      };
    } catch (error) {
      return { success: false, message: '更新邀请码失败' };
    }
  }

  async createInviteCode(code: string, maxUses: number, description?: string) {
    try {
      if (!code || maxUses < 0) {
        return { success: false, message: '参数无效' };
      }

      // 检查邀请码是否已存在
      const existing = await this.prisma.inviteCode.findUnique({
        where: { code }
      });

      if (existing) {
        return { success: false, message: '邀请码已存在' };
      }

      const newCode = await this.prisma.inviteCode.create({
        data: {
          code,
          maxUses,
          currentUses: 0,
          createdBy: 'admin'
        }
      });

      return {
        success: true,
        message: '邀请码创建成功',
        data: {
          code: newCode.code,
          max_uses: newCode.maxUses,
          current_uses: newCode.currentUses,
          remaining_uses: newCode.maxUses,
          created_at: newCode.createdAt
        }
      };
    } catch (error) {
      return { success: false, message: '创建邀请码失败' };
    }
  }
}


