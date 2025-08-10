import { Controller, Get } from '@nestjs/common';

@Controller('/v1/health')
export class HealthController {
  @Get()
  get() {
    return {
      success: true,
      code: 'OK',
      message: 'Healthy',
      data: {
        env: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
      },
    };
  }
}


