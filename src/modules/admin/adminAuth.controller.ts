import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('/v1/admin/auth')
export class AdminAuthController {
  @Post('/login')
  async login(@Body() body: { username: string; password: string }) {
    const { username, password } = body || {};
    const envUser = process.env.ADMIN_USERNAME;
    const envPass = process.env.ADMIN_PASSWORD;
    if (!envUser || !envPass) {
      return { success: false, code: 'CONFIG_MISSING', message: 'ADMIN_USERNAME/ADMIN_PASSWORD 未配置' };
    }
    if (!username || !password) {
      return { success: false, code: 'INVALID', message: '用户名或密码不能为空' };
    }
    if (username !== envUser || password !== envPass) {
      return { success: false, code: 'UNAUTHORIZED', message: '用户名或密码错误' };
    }
    const secret = process.env.JWT_SECRET || '';
    if (!secret) {
      return { success: false, code: 'CONFIG_MISSING', message: 'JWT_SECRET 未配置' };
    }
    const token = jwt.sign({ sub: `admin:${username}`, role: 'admin', username }, secret, { expiresIn: '7d' });
    return { success: true, code: 'OK', message: '登录成功', data: { access_token: token, admin: { username } } };
  }

  @Get('/me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: any) {
    return { success: true, code: 'OK', data: { user } };
  }
}

