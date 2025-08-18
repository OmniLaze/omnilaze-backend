import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import jwt from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { ConfigService } from '../../config/config.service';
import { SendVerificationCodeDto, LoginWithPhoneDto, VerifyInviteCodeDto } from './dto/auth.dto';

@ApiTags('Authentication')
@Controller('/v1')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('/send-verification-code')
  @ApiOperation({ summary: 'Send SMS verification code', description: 'Send verification code to user phone number' })
  @ApiBody({ type: SendVerificationCodeDto })
  @ApiResponse({ status: 200, description: 'Verification code sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid phone number format' })
  async sendCode(@Body() body: SendVerificationCodeDto) {
    const res = await this.authService.sendVerificationCode(body.phone_number);
    return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message, data: res.data };
  }

  @Post('/login-with-phone')
  @ApiOperation({ summary: 'Login with phone and verification code', description: 'Authenticate user with phone number and SMS code' })
  @ApiBody({ type: LoginWithPhoneDto })
  @ApiResponse({ status: 200, description: 'Login successful, returns JWT token' })
  @ApiResponse({ status: 400, description: 'Invalid phone number or verification code' })
  @ApiResponse({ status: 500, description: 'JWT secret not configured' })
  async login(@Body() body: LoginWithPhoneDto) {
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

  @Post('/verify-invite-code')
  @ApiOperation({ summary: 'Verify invite code and create account', description: 'Verify invite code and create new user account' })
  @ApiBody({ type: VerifyInviteCodeDto })
  @ApiResponse({ status: 201, description: 'Account created successfully, returns JWT token' })
  @ApiResponse({ status: 400, description: 'Invalid invite code or phone number' })
  @ApiResponse({ status: 500, description: 'JWT secret not configured' })
  async verifyInvite(@Body() body: VerifyInviteCodeDto) {
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

