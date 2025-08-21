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
        deliveryTime: formData.deliveryTime || null, // 添加用餐时间
        dietaryRestrictions: JSON.stringify(formData.allergies || []),
        foodPreferences: JSON.stringify(formData.preferences || []),
        budgetAmount: budget,
        budgetCurrency: 'CNY',
        metadata: { foodType: formData.foodType || [], orderType: (formData.foodType || []).includes('drink') ? 'drink' : 'food' },
      },
    });
    return { success: true, message: '订单创建成功', data: { order_id: order.id, order_number: order.orderNumber } };
  }

  async submitOrder(orderId: string, userId: string) {
    if (!orderId) return { success: false, message: '订单ID不能为空' };
    if (!userId) return { success: false, message: '用户ID不能为空' };
    
    // First verify the order belongs to the user
    const existingOrder = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!existingOrder) return { success: false, message: '订单不存在' };
    if (existingOrder.userId !== userId) return { success: false, message: '您无权操作此订单' };
    
    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'submitted', submittedAt: new Date(), updatedAt: new Date() },
    });
    return { success: true, message: '订单提交成功', data: { order_number: order.orderNumber } };
  }

  async updateOrderFeedback(orderId: string, userId: string, rating: number, feedback?: string) {
    if (!orderId) return { success: false, message: '订单ID不能为空' };
    if (!userId) return { success: false, message: '用户ID不能为空' };
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { success: false, message: '评分必须在1-5之间' };
    
    const exists = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!exists) return { success: false, message: '订单不存在' };
    if (exists.userId !== userId) return { success: false, message: '您无权评价此订单' };
    
    await this.prisma.orderFeedback.create({ data: { orderId, userId: exists.userId, rating, comment: feedback || null } });
    return { success: true, message: '反馈提交成功' };
  }

  async getUserOrders(userId: string) {
    if (!userId) return { success: false, message: '用户ID不能为空' };
    const orders = await this.prisma.order.findMany({
      where: { userId, isDeleted: false },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        feedbacks: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    
    // Include arrival image URL in response
    const ordersWithImages = orders.map(order => ({
      ...order,
      arrivalImageUrl: order.arrivalImageUrl,
      arrivalImageTakenAt: order.arrivalImageTakenAt,
      arrivalImageSource: order.arrivalImageSource,
    }));
    
    return { success: true, message: 'OK', data: { orders: ordersWithImages, count: orders.length } };
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

  async adminListOrders(params: { since?: string; status?: string; limit: number }) {
    const where: any = { isDeleted: false };
    if (params.status) where.status = params.status;
    if (params.since) {
      const d = new Date(params.since);
      if (!isNaN(d.getTime())) where.createdAt = { gt: d };
    }
    const rows = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        createdAt: true,
        deliveryAddress: true,
        budgetAmount: true,
        arrivalImageUrl: true,
        phoneNumber: true,
        deliveryTime: true,
        dietaryRestrictions: true,
        foodPreferences: true,
        paymentStatus: true,
        paidAt: true,
        user: { select: { userSequence: true } },
      },
    });
    const items = rows.map((r) => ({
      id: r.id,
      orderNumber: r.orderNumber,
      status: r.status,
      createdAt: r.createdAt,
      deliveryAddress: r.deliveryAddress,
      budgetAmount: r.budgetAmount,
      arrivalImageUrl: r.arrivalImageUrl,
      phoneNumber: r.phoneNumber,
      deliveryTime: r.deliveryTime,
      dietaryRestrictions: r.dietaryRestrictions,
      foodPreferences: r.foodPreferences,
      paymentStatus: (r as any).paymentStatus,
      paidAt: (r as any).paidAt,
      userSequence: r.user?.userSequence ?? null,
    }));
    const next_since = items.length > 0 ? new Date(items[0].createdAt).toISOString() : params.since || null;
    return { items, next_since };
  }

  async adminUpdateOrderStatus(orderId: string, status: string) {
    const allowed = new Set(['draft','submitted','processing','delivering','completed','cancelled']);
    if (!allowed.has(status)) {
      return { success: false, message: '无效的订单状态' };
    }
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return { success: false, message: '订单不存在' };

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status, updatedAt: new Date() },
    });
    return { success: true, message: '状态已更新', data: { id: updated.id, status: updated.status } };
  }

  async adminGetOrderDetail(orderId: string) {
    if (!orderId) return null;
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        feedbacks: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!order) return null;
    const payments = await this.prisma.payment.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: 'desc' },
    });
    return {
      ...order,
      payments,
    };
  }

  async importArrivalImage(orderId: string, data: { image_url: string; source?: string; taken_at?: string }) {
    if (!orderId) return { success: false, message: '订单ID不能为空' };
    if (!data.image_url) return { success: false, message: '图片URL不能为空' };

    // Validate URL format
    try {
      new URL(data.image_url);
    } catch {
      return { success: false, message: '图片URL格式无效' };
    }

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return { success: false, message: '订单不存在' };

    const takenAt = data.taken_at ? new Date(data.taken_at) : null;
    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        arrivalImageUrl: data.image_url,
        arrivalImageSource: data.source || 'external',
        arrivalImageTakenAt: takenAt,
        arrivalImageImportedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      message: '到达图片导入成功',
      data: {
        arrival_image_url: updatedOrder.arrivalImageUrl,
        taken_at: updatedOrder.arrivalImageTakenAt,
        source: updatedOrder.arrivalImageSource,
      },
    };
  }

  async importArrivalImageByNumber(data: { order_number: string; image_url: string; source?: string; taken_at?: string }) {
    if (!data.order_number) return { success: false, message: '订单号不能为空' };
    if (!data.image_url) return { success: false, message: '图片URL不能为空' };

    // Validate URL format
    try {
      new URL(data.image_url);
    } catch {
      return { success: false, message: '图片URL格式无效' };
    }

    const order = await this.prisma.order.findUnique({ where: { orderNumber: data.order_number } });
    if (!order) return { success: false, message: '订单不存在' };

    const takenAt = data.taken_at ? new Date(data.taken_at) : null;
    const updatedOrder = await this.prisma.order.update({
      where: { orderNumber: data.order_number },
      data: {
        arrivalImageUrl: data.image_url,
        arrivalImageSource: data.source || 'external',
        arrivalImageTakenAt: takenAt,
        arrivalImageImportedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      message: '到达图片导入成功',
      data: {
        order_id: updatedOrder.id,
        arrival_image_url: updatedOrder.arrivalImageUrl,
        taken_at: updatedOrder.arrivalImageTakenAt,
        source: updatedOrder.arrivalImageSource,
      },
    };
  }

  async getArrivalImage(orderId: string, userId: string) {
    if (!orderId) return { success: false, message: '订单ID不能为空' };
    if (!userId) return { success: false, message: '用户ID不能为空' };

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        userId: true,
        arrivalImageUrl: true,
        arrivalImageTakenAt: true,
        arrivalImageSource: true,
      },
    });

    if (!order) return { success: false, message: '订单不存在' };
    if (order.userId !== userId) return { success: false, message: '您无权查看此订单' };

    return {
      success: true,
      data: {
        arrival_image_url: order.arrivalImageUrl,
        taken_at: order.arrivalImageTakenAt,
        source: order.arrivalImageSource,
      },
    };
  }

  async uploadVoiceFeedback(orderId: string, data: { audioUrl: string; userId: string; durationSec?: number; transcript?: string }) {
    if (!orderId) return { success: false, message: '订单ID不能为空' };
    if (!data.audioUrl) return { success: false, message: '音频URL不能为空' };
    if (!data.userId) return { success: false, message: '用户ID不能为空' };

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return { success: false, message: '订单不存在' };

    // Verify that the user owns this order
    if (order.userId !== data.userId) {
      return { success: false, message: '无权操作此订单' };
    }

    const voiceFeedback = await this.prisma.orderVoiceFeedback.create({
      data: {
        orderId,
        userId: data.userId,
        audioUrl: data.audioUrl,
        durationSec: data.durationSec,
        transcript: data.transcript,
      },
    });

    return {
      success: true,
      message: '语音反馈上传成功',
      data: {
        id: voiceFeedback.id,
        audio_url: voiceFeedback.audioUrl,
        duration_sec: voiceFeedback.durationSec,
        created_at: voiceFeedback.createdAt,
      },
    };
  }
}
