import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
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
  const originsRaw = process.env.CORS_ORIGINS || '[]';
  let origins: string[] = [];
  try {
    origins = JSON.parse(originsRaw);
  } catch {
    origins = [];
  }
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (origins.length === 0 || origins.includes('*') || origins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
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
  console.log(`CORS origins configured: ${originsRaw}`);
}

bootstrap();


