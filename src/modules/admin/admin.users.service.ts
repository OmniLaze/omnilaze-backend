import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(params: {
    query?: string;
    page: number;
    limit: number;
  }) {
    const { query, page, limit } = params;
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (query) {
      where.OR = [
        { phoneNumber: { contains: query } },
        { id: { contains: query } },
        { userInviteCode: { contains: query } },
        { inviteCode: { contains: query } },
      ];
    }
    
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          phoneNumber: true,
          role: true,
          createdAt: true,
          inviteCode: true,
          userInviteCode: true,
          userSequence: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    
    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            createdAt: true,
            budgetAmount: true,
            paymentStatus: true,
          },
        },
        preferences: true,
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });
    
    return user;
  }
}