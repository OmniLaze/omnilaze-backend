import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { InvitesService } from './invites.service';

@Controller('/v1')
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Get('/get-user-invite-stats')
  async stats(@Query('user_id') userId: string) {
    return this.invites.getUserInviteStats(userId);
  }

  @Get('/get-invite-progress')
  async progress(@Query('user_id') userId: string) {
    return this.invites.getInviteProgress(userId);
  }

  @Post('/claim-free-drink')
  async claim(@Body() body: { user_id: string }) {
    return this.invites.claimFreeDrink(body.user_id);
  }

  @Get('/free-drinks-remaining')
  async remaining() {
    return this.invites.freeDrinksRemaining();
  }
}


