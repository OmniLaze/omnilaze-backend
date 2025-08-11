"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        cors: false,
        logger: ['log', 'error', 'warn', 'debug', 'verbose']
    });
    // CORS
    const originsRaw = process.env.CORS_ORIGINS || '[]';
    let origins = [];
    try {
        origins = JSON.parse(originsRaw);
    }
    catch {
        origins = [];
    }
    app.enableCors({
        origin: (origin, cb) => {
            if (!origin)
                return cb(null, true);
            if (origins.length === 0 || origins.includes('*') || origins.includes(origin))
                return cb(null, true);
            return cb(new Error('Not allowed by CORS'));
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });
    // Request logging middleware
    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - IP: ${req.ip || req.connection.remoteAddress}`);
        next();
    });
    // Global pipes
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
    app.use((0, express_1.json)({ limit: '1mb' }));
    app.use((0, express_1.urlencoded)({ extended: false }));
    app.use((0, express_rate_limit_1.default)({
        windowMs: 60 * 1000,
        max: 120,
        standardHeaders: true,
        legacyHeaders: false,
    }));
    // Swagger
    const config = new swagger_1.DocumentBuilder()
        .setTitle('OmniLaze Backend API')
        .setDescription('REST API for OmniLaze with PostgreSQL and WebSocket')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('/docs', app, document);
    const port = Number(process.env.PORT || 3000);
    await app.listen(port, '0.0.0.0');
    // eslint-disable-next-line no-console
    console.log(`API listening on http://0.0.0.0:${port}`);
    // eslint-disable-next-line no-console
    console.log(`CORS origins configured: ${originsRaw}`);
}
bootstrap();
//# sourceMappingURL=main.js.map