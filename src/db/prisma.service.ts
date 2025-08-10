import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    if (process.env.SKIP_DB_CONNECTION === 'true') {
      console.log('Skipping database connection...');
      return;
    }
    try {
      await this.$connect();
      console.log('Database connected successfully');
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (process.env.SKIP_DB_CONNECTION === 'true') {
      return;
    }
    await this.$disconnect();
  }
}


