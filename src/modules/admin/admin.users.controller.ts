import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AdminUsersService } from './admin.users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@ApiTags('Admin - Users')
@Controller('/v1/admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminUsersController {
  constructor(private readonly usersService: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users with search and pagination' })
  @ApiQuery({ name: 'q', required: false, description: 'Search query (phone/id/invite code)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  async listUsers(
    @Query('q') query?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '50', 10);
    
    const result = await this.usersService.listUsers({
      query,
      page: pageNum,
      limit: limitNum,
    });
    
    return {
      success: true,
      code: 'OK',
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user details' })
  async getUserDetail(@Param('id') userId: string) {
    const user = await this.usersService.getUserDetail(userId);
    
    if (!user) {
      return {
        success: false,
        code: 'NOT_FOUND',
        message: 'User not found',
      };
    }
    
    return {
      success: true,
      code: 'OK',
      data: user,
    };
  }
}