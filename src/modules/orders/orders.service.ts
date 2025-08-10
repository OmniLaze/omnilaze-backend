import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(userId: string, phoneNumber: string, formData: any) {
    if (!userId || !phoneNumber) return { success: false, message: '用户信息不能为空' };
    if (!formData?.address) return { success: false, message: '配送地址不能为空' };
    const budget = Number(formData?.budget ?? 0);
    if (Number.isNaN(budget) || budget < 0) return { success: false, message: '预算金额无效' };

    const orderNumber = this.generateOrderNumber();
    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        userId,
        phoneNumber,
        status: 'draft',
        orderDate: new Date(),
        deliveryAddress: formData.address,
        dietaryRestrictions: JSON.stringify(formData.allergies || []),
        foodPreferences: JSON.stringify(formData.preferences || []),
        budgetAmount: budget,
        budgetCurrency: 'CNY',
        metadata: { foodType: formData.foodType || [], orderType: (formData.foodType || []).includes('drink') ? 'drink' : 'food' },
      },
    });
    return { success: true, message: '订单创建成功', data: { order_id: order.id, order_number: order.orderNumber } };
  }

  async submitOrder(orderId: string) {
    if (!orderId) return { success: false, message: '订单ID不能为空' };
    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'submitted', submittedAt: new Date(), updatedAt: new Date() },
    }).catch(() => null);
    if (!order) return { success: false, message: '订单不存在' };
    return { success: true, message: '订单提交成功', data: { order_number: order.orderNumber } };
  }

  async updateOrderFeedback(orderId: string, rating: number, feedback?: string) {
    if (!orderId) return { success: false, message: '订单ID不能为空' };
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { success: false, message: '评分必须在1-5之间' };
    const exists = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!exists) return { success: false, message: '订单不存在' };
    await this.prisma.orderFeedback.create({ data: { orderId, userId: exists.userId, rating, comment: feedback || null } });
    return { success: true, message: '反馈提交成功' };
  }

  async getUserOrders(userId: string) {
    if (!userId) return { success: false, message: '用户ID不能为空' };
    const orders = await this.prisma.order.findMany({
      where: { userId, isDeleted: false },
      orderBy: [{ createdAt: 'desc' }],
    });
    return { success: true, message: 'OK', data: { orders, count: orders.length } };
  }

  async listOrders(userId: string, filters: { status?: string }, paging: { page: number; pageSize: number }) {
    const where: any = { userId, isDeleted: false };
    if (filters.status) where.status = filters.status;
    const skip = (paging.page - 1) * paging.pageSize;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: paging.pageSize }),
      this.prisma.order.count({ where }),
    ]);
    return { items, page: paging.page, page_size: paging.pageSize, total };
  }

  private generateOrderNumber() {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD${today}${rand}`;
  }
}


