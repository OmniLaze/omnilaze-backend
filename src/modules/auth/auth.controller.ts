import { Body, Controller, Post } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { AuthService } from './auth.service';

@Controller('/v1')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/send-verification-code')
  async sendCode(@Body() body: { phone_number: string }) {
    const res = await this.authService.sendVerificationCode(body.phone_number);
    return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message, data: res.data };
  }

  @Post('/login-with-phone')
  async login(@Body() body: { phone_number: string; verification_code: string }) {
    const res = await this.authService.loginWithPhone(body.phone_number, body.verification_code);
    if (!res.success) return { success: false, code: 'ERROR', message: res.message };
    const data: any = res.data || {};
    if (data.user_id) {
      const token = jwt.sign({ sub: data.user_id, phone: data.phone_number, role: 'user' }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
      data.access_token = token;
    }
    return { success: true, code: 'OK', message: res.message, data };
  }

  // 阿里云 Dypnsapi - 通过 SpToken 获取手机号并登录/注册
  @Post('/login-with-aliyun-sp-token')
  async loginWithAliyun(@Body() body: { sp_token: string }) {
    const res = await this.authService.loginWithAliyunSpToken(body.sp_token);
    if (!res.success) return { success: false, code: 'ERROR', message: res.message };
    const data: any = res.data || {};
    if (data.user_id) {
      const token = jwt.sign({ sub: data.user_id, phone: data.phone_number, role: 'user' }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
      data.access_token = token;
    }
    return { success: true, code: 'OK', message: res.message, data };
  }

  @Post('/verify-invite-code')
  async verifyInvite(@Body() body: { phone_number: string; invite_code: string }) {
    const res = await this.authService.verifyInviteAndCreate(body.phone_number, body.invite_code);
    if (!res.success) return { success: false, code: 'ERROR', message: res.message };
    const data: any = res.data || {};
    if (data.user_id) {
      const token = jwt.sign({ sub: data.user_id, phone: data.phone_number, role: 'user' }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
      data.access_token = token;
    }
    return { success: true, code: 'OK', message: res.message, data };
  }
}


