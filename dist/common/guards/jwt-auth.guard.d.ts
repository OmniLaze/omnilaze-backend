import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
export declare class JwtAuthGuard implements CanActivate {
    private readonly config;
    constructor(config: ConfigService);
    canActivate(context: ExecutionContext): boolean;
}
