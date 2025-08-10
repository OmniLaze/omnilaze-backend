import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { PreferencesService } from './preferences.service';

@Controller('/v1')
export class PreferencesController {
  constructor(private readonly prefs: PreferencesService) {}

  @Get('/preferences/:userId')
  async get(@Param('userId') userId: string) {
    const res = await this.prefs.getUserPreferences(userId);
    return res;
  }

  @Post('/preferences')
  async save(@Body() body: { user_id: string; form_data: any }) {
    return this.prefs.saveUserPreferences(body.user_id, body.form_data);
  }

  @Put('/preferences/:userId')
  async update(@Param('userId') userId: string, @Body() updates: any) {
    return this.prefs.updateUserPreferences(userId, updates);
  }

  @Delete('/preferences/:userId')
  async remove(@Param('userId') userId: string) {
    return this.prefs.deleteUserPreferences(userId);
  }

  @Get('/preferences/:userId/complete')
  async complete(@Param('userId') userId: string) {
    return this.prefs.checkCompleteness(userId);
  }

  @Get('/preferences/:userId/form-data')
  async asForm(@Param('userId') userId: string) {
    return this.prefs.getAsFormData(userId);
  }
}


