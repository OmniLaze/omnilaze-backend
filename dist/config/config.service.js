"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigService = void 0;
const dotenv = __importStar(require("dotenv"));
dotenv.config();
class ConfigService {
    get nodeEnv() {
        return process.env.NODE_ENV || 'development';
    }
    get port() {
        return Number(process.env.PORT || 3000);
    }
    get corsOrigins() {
        // If explicitly set, honor it
        const raw = process.env.CORS_ORIGINS;
        if (raw && raw.trim().length > 0) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0)
                    return parsed;
            }
            catch {
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
    get databaseUrl() {
        const url = process.env.DATABASE_URL;
        if (!url)
            throw new Error('DATABASE_URL is not set');
        return url;
    }
    get redisUrl() {
        return process.env.REDIS_URL;
    }
    get jwtSecret() {
        const s = process.env.JWT_SECRET;
        if (!s)
            throw new Error('JWT_SECRET is not set');
        return s;
    }
    // Alipay
    get alipayAppId() {
        return process.env.ALIPAY_APP_ID;
    }
    get alipayPrivateKey() {
        return process.env.ALIPAY_PRIVATE_KEY;
    }
    get alipayPublicKey() {
        return process.env.ALIPAY_PUBLIC_KEY;
    }
    get alipayGateway() {
        return process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do';
    }
    get alipayNotifyUrl() {
        return process.env.ALIPAY_NOTIFY_URL;
    }
    // System API Key for protected endpoints
    get systemApiKey() {
        return process.env.SYSTEM_API_KEY;
    }
}
exports.ConfigService = ConfigService;
//# sourceMappingURL=config.service.js.map