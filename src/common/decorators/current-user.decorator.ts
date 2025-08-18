import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  sub: string; // user ID
  phone: string; // phone number (matches AuthController JWT generation)
  role?: string;
  iat?: number;
  exp?: number;
}

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;
    
    if (!user) {
      return null;
    }
    
    return data ? user[data] : user;
  },
);

export const CurrentUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;
    return user?.sub || '';
  },
);