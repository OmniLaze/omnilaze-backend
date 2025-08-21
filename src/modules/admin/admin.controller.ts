import { Body, Controller, Get, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AdminOrSystemKeyGuard } from '../../common/guards/admin-or-system-key.guard';
import { PrismaService } from '../../db/prisma.service';
import { NotificationsService, NotificationConfig } from '../notifications/notifications.service';

@Controller('/v1/admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}
  @Post('/aws/deploy')
  @UseGuards(AdminOrSystemKeyGuard)
  async triggerDeploy(@Body() body: { ref?: string; inputs?: Record<string, any> }) {
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO; // e.g. "owner/repo"
    const workflow = process.env.GITHUB_WORKFLOW_ID || 'aws-deploy.yml';
    const ref = body?.ref || process.env.GITHUB_REF || 'main';

    if (!token || !repo || !workflow) {
      return {
        success: false,
        code: 'CONFIG_MISSING',
        message: 'GitHub workflow dispatch is not configured (GITHUB_TOKEN/GITHUB_REPO/GITHUB_WORKFLOW_ID)'
      };
    }

    const url = `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref, inputs: body?.inputs || {} }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return { success: false, code: 'DISPATCH_FAILED', message: txt || 'Workflow dispatch failed' };
    }

    return { success: true, code: 'OK', message: 'Deployment workflow dispatched' };
  }

  @Get('/aws/status')
  @UseGuards(AdminOrSystemKeyGuard)
  async getDeployStatus(@Query('per_page') perPage = '1') {
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO; // e.g. "owner/repo"
    const workflow = process.env.GITHUB_WORKFLOW_ID || 'aws-deploy.yml';
    if (!token || !repo || !workflow) {
      return {
        success: false,
        code: 'CONFIG_MISSING',
        message: 'GitHub workflow dispatch is not configured (GITHUB_TOKEN/GITHUB_REPO/GITHUB_WORKFLOW_ID)'
      };
    }

    const url = `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/runs?per_page=${encodeURIComponent(perPage)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      const txt = await res.text();
      return { success: false, code: 'STATUS_FAILED', message: txt || 'Failed to fetch workflow runs' };
    }
    const data = await res.json();
    const latest = Array.isArray(data?.workflow_runs) && data.workflow_runs.length > 0 ? data.workflow_runs[0] : null;
    if (!latest) return { success: true, code: 'OK', data: { runs: [] } };
    return {
      success: true,
      code: 'OK',
      data: {
        runs: data.workflow_runs.map((r: any) => ({
          id: r.id,
          name: r.name,
          status: r.status,
          conclusion: r.conclusion,
          run_number: r.run_number,
          html_url: r.html_url,
          created_at: r.created_at,
          updated_at: r.updated_at,
          head_branch: r.head_branch,
          head_sha: r.head_sha,
        })),
      },
    };
  }

  // =============== Simple Admin data listing endpoints ===============
  @Get('/users')
  @UseGuards(AdminOrSystemKeyGuard)
  async listUsers(
    @Query('q') q?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    const take = Math.max(1, Math.min(200, Number(limit) || 50));
    const skip = (Math.max(1, Number(page) || 1) - 1) * take;
    const where: any = {};
    if (q && q.trim()) {
      where.OR = [
        { phoneNumber: { contains: q } },
        { id: { contains: q } },
        { userInviteCode: { contains: q } },
      ];
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          phoneNumber: true,
          role: true,
          createdAt: true,
          inviteCode: true,
          userInviteCode: true,
          userSequence: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { success: true, code: 'OK', data: { items, total, page: Number(page), limit: take } };
  }

  @Get('/invitations')
  @UseGuards(AdminOrSystemKeyGuard)
  async listInvitations(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    const take = Math.max(1, Math.min(200, Number(limit) || 50));
    const skip = (Math.max(1, Number(page) || 1) - 1) * take;
    const items = await this.prisma.invitation.findMany({
      orderBy: { invitedAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        inviterUserId: true,
        inviteeUserId: true,
        inviteCode: true,
        inviteePhone: true,
        invitedAt: true,
      },
    });
    const total = await this.prisma.invitation.count();
    return { success: true, code: 'OK', data: { items, total, page: Number(page), limit: take } };
  }

  // ===== Notifications config (admin) =====
  @Get('/notifications/config')
  @UseGuards(AdminOrSystemKeyGuard)
  async getNotificationsConfig() {
    const cfg = await this.notifications.getConfig()
    return { success: true, code: 'OK', data: cfg }
  }

  @Put('/notifications/config')
  @UseGuards(AdminOrSystemKeyGuard)
  async setNotificationsConfig(@Body() body: { config: NotificationConfig }) {
    if (!body?.config) return { success: false, code: 'INVALID', message: 'Missing config' }
    await this.notifications.setConfig(body.config)
    return { success: true, code: 'OK' }
  }
}
