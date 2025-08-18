import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

@Injectable()
export class AdminInvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listInvitations(params: { limit: number; page: number }) {
    const { limit, page } = params;
    const skip = (page - 1) * limit;
    
    const [items, total] = await Promise.all([
      this.prisma.invitation.findMany({
        skip,
        take: limit,
        orderBy: { invitedAt: 'desc' },
      }),
      this.prisma.invitation.count(),
    ]);
    
    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }
}