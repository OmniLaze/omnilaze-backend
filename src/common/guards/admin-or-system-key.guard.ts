import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '../../config/config.service'
import { JwtAuthGuard } from './jwt-auth.guard'
import { AdminGuard } from './admin.guard'

@Injectable()
export class AdminOrSystemKeyGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly jwtGuard: JwtAuthGuard,
    private readonly adminGuard: AdminGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest()

    // 1) Allow with valid X-System-Key
    const configuredKey = this.config.systemApiKey
    const providedKey = (req.headers?.['x-system-key'] || req.headers?.['X-System-Key']) as string | undefined
    if (configuredKey && providedKey && providedKey === configuredKey) {
      return true
    }

    // 2) Fallback to Admin JWT (JwtAuthGuard + AdminGuard)
    try {
      const jwtOk = await Promise.resolve(this.jwtGuard.canActivate(context))
      if (!jwtOk) throw new UnauthorizedException('Unauthorized')
      const adminOk = await Promise.resolve(this.adminGuard.canActivate(context))
      if (!adminOk) throw new UnauthorizedException('Admin required')
      return true
    } catch (e) {
      throw new UnauthorizedException('Unauthorized: admin token or valid system key required')
    }
  }
}

