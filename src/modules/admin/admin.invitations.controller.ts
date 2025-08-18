import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AdminInvitationsService } from './admin.invitations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@ApiTags('Admin - Invitations')
@Controller('/v1/admin/invitations')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminInvitationsController {
  constructor(private readonly invitationsService: AdminInvitationsService) {}

  @Get()
  @ApiOperation({ summary: 'List invitation records' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items limit' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  async listInvitations(
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    const limitNum = parseInt(limit || '100', 10);
    const pageNum = parseInt(page || '1', 10);
    
    const result = await this.invitationsService.listInvitations({
      limit: limitNum,
      page: pageNum,
    });
    
    return {
      success: true,
      code: 'OK',
      data: result,
    };
  }
}