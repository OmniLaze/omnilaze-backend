import * as dotenv from 'dotenv';
dotenv.config();

export class ConfigService {
  get nodeEnv(): string {
    return process.env.NODE_ENV || 'development';
  }

  get port(): number {
    return Number(process.env.PORT || 3000);
  }

  get corsOrigins(): string[] {
    // If explicitly set, honor it
    const raw = process.env.CORS_ORIGINS;
    if (raw && raw.trim().length > 0) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // fall through to defaults
      }
    }
    // Production-safe defaults if not provided
    if (this.nodeEnv === 'production') {
      return [
        'https://omnilaze.co',
        'https://www.omnilaze.co',
      ];
    }
    return [];
  }

  get databaseUrl(): string {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    return url;
  }

  get redisUrl(): string | undefined {
    return process.env.REDIS_URL;
  }

  get jwtSecret(): string {
    const s = process.env.JWT_SECRET;
    if (!s) throw new Error('JWT_SECRET is not set');
    return s;
  }

  // Alipay
  get alipayAppId(): string | undefined {
    return process.env.ALIPAY_APP_ID;
  }
  get alipayPrivateKey(): string | undefined {
    return process.env.ALIPAY_PRIVATE_KEY;
  }
  get alipayPublicKey(): string | undefined {
    return process.env.ALIPAY_PUBLIC_KEY;
  }
  get alipayGateway(): string {
    return process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do';
  }
  get alipayNotifyUrl(): string | undefined {
    return process.env.ALIPAY_NOTIFY_URL;
  }
}

