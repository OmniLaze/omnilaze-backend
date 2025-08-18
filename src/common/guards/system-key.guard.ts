import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';

@Injectable()
export class SystemKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const systemKey = this.configService.systemApiKey;
    
    if (!systemKey) {
      // If no system key is configured, reject all requests for security
      throw new UnauthorizedException('System API key not configured');
    }

    const providedKey = request.headers['x-system-key'] || request.headers['X-System-Key'];
    
    if (!providedKey) {
      throw new UnauthorizedException('System API key required');
    }

    if (providedKey !== systemKey) {
      throw new UnauthorizedException('Invalid system API key');
    }

    return true;
  }
}