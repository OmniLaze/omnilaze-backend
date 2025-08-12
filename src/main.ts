import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import rateLimit from 'express-rate-limit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { 
    cors: false,
    logger: ['log', 'error', 'warn', 'debug', 'verbose']
  });

  // CORS
  const configService = app.get(ConfigService);
  const origins: string[] = configService.corsOrigins;
  const isDev = configService.nodeEnv !== 'production';
  app.enableCors({
    origin: (origin, cb) => {
      if (isDev) return cb(null, true);
      if (!origin) return cb(null, true);
      if (origins.length === 0 || origins.includes('*') || origins.includes(origin)) return cb(null, true);
      return cb(new Error(`Not allowed by CORS: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    // Allow common headers to reduce preflight failures
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    credentials: true,
    exposedHeaders: ['Authorization'],
  });

  // Request logging middleware
  app.use((req: any, res: any, next: any) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - IP: ${req.ip || req.connection.remoteAddress}`);
    next();
  });

  // Global pipes
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: false }));
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('OmniLaze Backend API')
    .setDescription('REST API for OmniLaze with PostgreSQL and WebSocket')
    .setVersion('1.0')
    .addServer('https://backend.omnilaze.co', 'Production HTTPS')
    .addServer('http://backend.omnilaze.co', 'Production HTTP')
    .addServer('http://localhost:3000', 'Local Development')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/docs', app, document);

  const port = Number(process.env.PORT || 3000);
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`API listening on http://0.0.0.0:${port}`);
  // eslint-disable-next-line no-console
  console.log(`CORS origins configured: ${JSON.stringify(origins)}`);
}

bootstrap();
