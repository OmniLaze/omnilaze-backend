import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AdminAwsService } from './admin.aws.service';
import { AdminOrSystemKeyGuard } from '../../common/guards/admin-or-system-key.guard';

@ApiTags('Admin - AWS')
@Controller('/v1/admin/aws')
@UseGuards(AdminOrSystemKeyGuard)
export class AdminAwsController {
  constructor(private readonly awsService: AdminAwsService) {}

  @Post('/deploy')
  @ApiOperation({ summary: 'Trigger GitHub Actions deployment' })
  async triggerDeploy(@Body() body: { ref?: string }) {
    const result = await this.awsService.triggerDeploy(body.ref || 'main');
    
    return {
      success: result.success,
      code: result.success ? 'OK' : 'ERROR',
      message: result.message,
      data: result.data,
    };
  }

  @Get('/status')
  @ApiOperation({ summary: 'Get deployment status' })
  @ApiQuery({ name: 'per_page', required: false, type: Number, description: 'Number of runs to fetch' })
  async getDeploymentStatus(@Query('per_page') perPage?: string) {
    const limit = parseInt(perPage || '3', 10);
    const result = await this.awsService.getDeploymentStatus(limit);
    
    return {
      success: result.success,
      code: result.success ? 'OK' : 'ERROR',
      message: result.message,
      data: result.data,
    };
  }
}
