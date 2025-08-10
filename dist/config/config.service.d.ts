export declare class ConfigService {
    get nodeEnv(): string;
    get port(): number;
    get corsOrigins(): string[];
    get databaseUrl(): string;
    get redisUrl(): string | undefined;
    get jwtSecret(): string;
    get alipayAppId(): string | undefined;
    get alipayPrivateKey(): string | undefined;
    get alipayPublicKey(): string | undefined;
    get alipayGateway(): string;
    get alipayNotifyUrl(): string | undefined;
}
