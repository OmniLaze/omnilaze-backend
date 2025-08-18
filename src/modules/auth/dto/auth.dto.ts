import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendVerificationCodeDto {
  @ApiProperty({
    description: '11位手机号码',
    example: '13800138000',
    pattern: '^\\d{11}$'
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{11}$/, { message: '请输入正确的11位手机号码' })
  phone_number: string;
}

export class LoginWithPhoneDto {
  @ApiProperty({
    description: '11位手机号码',
    example: '13800138000',
    pattern: '^\\d{11}$'
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{11}$/, { message: '请输入正确的11位手机号码' })
  phone_number: string;

  @ApiProperty({
    description: '6位验证码',
    example: '123456',
    minLength: 6,
    maxLength: 6
  })
  @IsString()
  @IsNotEmpty()
  verification_code: string;
}

export class VerifyInviteCodeDto {
  @ApiProperty({
    description: '11位手机号码',
    example: '13800138000',
    pattern: '^\\d{11}$'
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{11}$/, { message: '请输入正确的11位手机号码' })
  phone_number: string;

  @ApiProperty({
    description: '邀请码',
    example: 'WELCOME',
    minLength: 1
  })
  @IsString()
  @IsNotEmpty()
  invite_code: string;
}