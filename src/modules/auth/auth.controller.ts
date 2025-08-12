import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { ConfigService } from '../../config/config.service';

@Controller('/v1')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('/send-verification-code')
  async sendCode(@Body() body: { phone_number: string }) {
    const res = await this.authService.sendVerificationCode(body.phone_number);
    return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message, data: res.data };
  }

  @Post('/login-with-phone')
  async login(@Body() body: { phone_number: string; verification_code: string }) {
    console.log('[Auth] /v1/login-with-phone called');
    const res = await this.authService.loginWithPhone(body.phone_number, body.verification_code);
    if (!res.success) return { success: false, code: 'ERROR', message: res.message };
    const data: any = res.data || {};
    if (data.user_id) {
      const secret = process.env.JWT_SECRET || this.config.jwtSecret || '';
      if (!secret) {
        console.error('[Auth] JWT_SECRET is missing; cannot issue token');
        throw new HttpException('服务器配置缺失：JWT_SECRET 未设置', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      const token = jwt.sign(
        { sub: data.user_id, phone: data.phone_number, role: 'user' },
        secret,
        { expiresIn: '7d' },
      );
      data.access_token = token;
      console.log('[Auth] Issued JWT (len):', token.length);
    }
    return { success: true, code: 'OK', message: res.message, data };
  }

  // 阿里云获取授权Token（一键登录第一步）
  @Post('/get-aliyun-auth-token')
  async getAliyunAuthToken() {
    const res = await this.authService.getAliyunAuthToken();
    if (!res.success) return { success: false, code: 'ERROR', message: res.message };
    return { success: true, code: 'OK', message: res.message, data: res.data };
  }

  // 阿里云 Dypnsapi - 通过 SpToken 获取手机号并登录/注册
  @Post('/login-with-aliyun-sp-token')
  async loginWithAliyun(@Body() body: { sp_token: string }) {
    console.log('[Auth] /v1/login-with-aliyun-sp-token called');
    const res = await this.authService.loginWithAliyunSpToken(body.sp_token);
    if (!res.success) return { success: false, code: 'ERROR', message: res.message };
    const data: any = res.data || {};
    if (data.user_id) {
      const secret = process.env.JWT_SECRET || this.config.jwtSecret || '';
      if (!secret) {
        console.error('[Auth] JWT_SECRET is missing; cannot issue token');
        throw new HttpException('服务器配置缺失：JWT_SECRET 未设置', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      const token = jwt.sign(
        { sub: data.user_id, phone: data.phone_number, role: 'user' },
        secret,
        { expiresIn: '7d' },
      );
      data.access_token = token;
      console.log('[Auth] Issued JWT (len):', token.length);
    }
    return { success: true, code: 'OK', message: res.message, data };
  }

  @Post('/verify-invite-code')
  async verifyInvite(@Body() body: { phone_number: string; invite_code: string }) {
    const res = await this.authService.verifyInviteAndCreate(body.phone_number, body.invite_code);
    if (!res.success) return { success: false, code: 'ERROR', message: res.message };
    const data: any = res.data || {};
    if (data.user_id) {
      const secret = process.env.JWT_SECRET || this.config.jwtSecret || '';
      if (!secret) {
        console.error('[Auth] JWT_SECRET is missing; cannot issue token');
        throw new HttpException('服务器配置缺失：JWT_SECRET 未设置', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      const token = jwt.sign(
        { sub: data.user_id, phone: data.phone_number, role: 'user' },
        secret,
        { expiresIn: '7d' },
      );
      data.access_token = token;
      console.log('[Auth] Issued JWT (len):', token.length);
    }
    return { success: true, code: 'OK', message: res.message, data };
  }
}

