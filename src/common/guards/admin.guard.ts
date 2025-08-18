import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { JwtPayload } from '../decorators/current-user.decorator';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;
    
    if (!user) {
      throw new ForbiddenException('需要登录才能访问');
    }
    
    // Allow either role=admin in JWT or user id in ADMIN_USER_IDS
    const adminUserIds = process.env.ADMIN_USER_IDS?.split(',') || [];
    const isAdmin = user as any;
    const hasAdminRole = (isAdmin as any)?.role === 'admin';
    const listedAdmin = adminUserIds.includes(user.sub);
    
    if (!hasAdminRole && !listedAdmin) {
      throw new ForbiddenException('需要管理员权限');
    }
    
    return true;
  }
}
