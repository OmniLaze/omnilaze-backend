import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { ConfigService } from '../../config/config.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) throw new UnauthorizedException('Missing token');
    const token = auth.slice(7);
    try {
      const secret = process.env.JWT_SECRET || this.config.jwtSecret || '';
      if (!secret) {
        console.error('[Auth] JWT_SECRET is missing; cannot verify token');
        throw new InternalServerErrorException('服务器配置缺失：JWT_SECRET 未设置');
      }
      const payload = jwt.verify(token, secret) as any;
      req.user = payload;
      return true;
    } catch (e) {
      if (e instanceof InternalServerErrorException) throw e;
      throw new UnauthorizedException('Invalid token');
    }
  }
}

