import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, ForbiddenException } from '@nestjs/common';
import { PreferencesService } from './preferences.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';

@Controller('/v1')
export class PreferencesController {
  constructor(private readonly prefs: PreferencesService) {}

  @Get('/preferences/:userId')
  @UseGuards(JwtAuthGuard)
  async get(
    @CurrentUserId() currentUserId: string,
    @Param('userId') userId: string
  ) {
    // Users can only view their own preferences
    if (currentUserId !== userId) {
      throw new ForbiddenException('您无权查看其他用户的偏好设置');
    }
    const res = await this.prefs.getUserPreferences(userId);
    return res;
  }

  @Post('/preferences')
  @UseGuards(JwtAuthGuard)
  async save(
    @CurrentUserId() userId: string,
    @Body() body: { form_data: any }
  ) {
    // Use user ID from JWT, not from body
    return this.prefs.saveUserPreferences(userId, body.form_data);
  }

  @Put('/preferences/:userId')
  @UseGuards(JwtAuthGuard)
  async update(
    @CurrentUserId() currentUserId: string,
    @Param('userId') userId: string,
    @Body() updates: any
  ) {
    // Users can only update their own preferences
    if (currentUserId !== userId) {
      throw new ForbiddenException('您无权修改其他用户的偏好设置');
    }
    return this.prefs.updateUserPreferences(userId, updates);
  }

  @Delete('/preferences/:userId')
  @UseGuards(JwtAuthGuard)
  async remove(
    @CurrentUserId() currentUserId: string,
    @Param('userId') userId: string
  ) {
    // Users can only delete their own preferences
    if (currentUserId !== userId) {
      throw new ForbiddenException('您无权删除其他用户的偏好设置');
    }
    return this.prefs.deleteUserPreferences(userId);
  }

  @Get('/preferences/:userId/complete')
  @UseGuards(JwtAuthGuard)
  async complete(
    @CurrentUserId() currentUserId: string,
    @Param('userId') userId: string
  ) {
    // Users can only check their own preferences completeness
    if (currentUserId !== userId) {
      throw new ForbiddenException('您无权查看其他用户的偏好设置');
    }
    return this.prefs.checkCompleteness(userId);
  }

  @Get('/preferences/:userId/form-data')
  @UseGuards(JwtAuthGuard)
  async asForm(
    @CurrentUserId() currentUserId: string,
    @Param('userId') userId: string
  ) {
    // Users can only get their own form data
    if (currentUserId !== userId) {
      throw new ForbiddenException('您无权查看其他用户的偏好设置');
    }
    return this.prefs.getAsFormData(userId);
  }
}


