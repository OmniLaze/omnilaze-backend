import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { InvitesService } from './invites.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SystemKeyGuard } from '../../common/guards/system-key.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@Controller('/v1')
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Get('/get-user-invite-stats')
  @UseGuards(JwtAuthGuard)
  async stats(@Query('user_id') userId: string) {
    return this.invites.getUserInviteStats(userId);
  }

  @Get('/get-invite-progress')
  @UseGuards(JwtAuthGuard)
  async progress(@Query('user_id') userId: string) {
    return this.invites.getInviteProgress(userId);
  }

  @Post('/claim-free-drink')
  @UseGuards(JwtAuthGuard)
  async claim(@Body() body: { user_id: string }) {
    return this.invites.claimFreeDrink(body.user_id);
  }

  @Get('/free-drinks-remaining')
  async remaining() {
    return this.invites.freeDrinksRemaining();
  }

  // 管理员API端点 - 使用SystemKeyGuard或JwtAuthGuard+AdminGuard
  @Get('/admin/invite-codes')
  @UseGuards(SystemKeyGuard)
  async getAllInviteCodes() {
    return this.invites.getAllInviteCodes();
  }

  @Post('/admin/update-invite-code')
  @UseGuards(SystemKeyGuard)
  async updateInviteCode(@Body() body: { code: string; max_uses: number }) {
    return this.invites.updateInviteCodeMaxUses(body.code, body.max_uses);
  }

  @Post('/admin/create-invite-code')
  @UseGuards(SystemKeyGuard)
  async createInviteCode(@Body() body: { code: string; max_uses: number; description?: string }) {
    return this.invites.createInviteCode(body.code, body.max_uses, body.description);
  }

  // 批量更新邀请码 (一键更新到1000次使用)
  @Post('/admin/batch-update-invites')
  @UseGuards(SystemKeyGuard)
  async batchUpdateInvites() {
    return this.invites.batchUpdateInvites();
  }
}

