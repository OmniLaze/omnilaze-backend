import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { PrismaService } from '../../db/prisma.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { AdminGuard } from '../../common/guards/admin.guard'

@Controller('/v1/admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminInviteCodesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('/invite-codes')
  async listCodes() {
    const rows = await this.prisma.inviteCode.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
    })
    const data = rows.map((r) => ({
      code: r.code,
      max_uses: r.maxUses,
      current_uses: r.currentUses,
      remaining_uses: Math.max(0, r.maxUses - r.currentUses),
      created_at: r.createdAt?.toISOString?.() || null,
      used_by: r.usedBy,
      used_at: r.usedAt?.toISOString?.() || null,
    }))
    return { success: true, code: 'OK', data }
  }

  @Post('/create-invite-code')
  async createCode(@Body() body: { code: string; max_uses?: number; description?: string }) {
    const code = (body?.code || '').trim().toUpperCase()
    const maxUses = Math.max(1, Math.min(10000, Number(body?.max_uses || 10)))
    if (!code) return { success: false, code: 'INVALID', message: '邀请码不能为空' }

    const exists = await this.prisma.inviteCode.findUnique({ where: { code } }).catch(() => null)
    if (exists) return { success: false, code: 'EXISTS', message: '邀请码已存在' }

    await this.prisma.inviteCode.create({
      data: {
        code,
        maxUses,
        currentUses: 0,
        inviteType: 'system',
      },
    })
    return { success: true, code: 'OK', message: '创建成功' }
  }
}
