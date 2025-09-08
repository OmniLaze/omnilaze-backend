import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { OrdersGateway } from './orders.gateway';

// 统一的订单状态计算函数
function calculateDisplayStatus(order: any): string {
  // 有到达图片 = 已完成
  if (order.arrivalImageUrl) return 'completed';
  
  // 已支付
  if (order.paymentStatus === 'paid' || order.paidAt) {
    // Nexus设置了配送中
    if (order.status === 'delivering') return 'delivering';
    // 否则显示已支付
    return 'paid';
  }
  
  // 支付处理中
  if (order.paymentStatus === 'pending_payment') return 'pending_payment';
  
  // 未支付（包括 draft, submitted, processing 等所有支付前状态）
  return 'unpaid';
}

// 添加displayStatus到订单对象
function enhanceOrderWithDisplayStatus(order: any) {
  return {
    ...order,
    displayStatus: calculateDisplayStatus(order)
  };
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => OrdersGateway))
    private readonly ordersGateway: OrdersGateway
  ) {}

  async createOrder(userId: string, phoneNumber: string, formData: any) {
    if (!userId || !phoneNumber) return { success: false, message: '用户信息不能为空' };
    if (!formData?.address) return { success: false, message: '配送地址不能为空' };
    const budget = Number(formData?.budget ?? 0);
    if (Number.isNaN(budget) || budget < 0) return { success: false, message: '预算金额无效' };

    // 检查用户是否为测试用户
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { success: false, message: '用户不存在' };
    }
    const isTestOrder = user.isTestUser || false;

    const orderNumber = this.generateOrderNumber();
    
    console.log(`[createOrder] 创建${isTestOrder ? '测试' : '正式'}订单 - userId: ${userId}, phoneNumber: ${phoneNumber}`);
    
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
        metadata: { 
          foodType: formData.foodType || [], 
          orderType: (formData.foodType || []).includes('drink') ? 'drink' : 'food',
          isTestEnvironment: isTestOrder  // 在metadata中也标记测试环境
        },
        isTestOrder: isTestOrder,  // 设置测试订单标识
      },
    });
    
    console.log(`[createOrder] ${isTestOrder ? '测试' : '正式'}订单创建成功 - orderId: ${order.id}, status: ${order.status}, isDeleted: ${order.isDeleted}, isTestOrder: ${order.isTestOrder}`);
    
    return { success: true, message: '订单创建成功', data: { order_id: order.id, order_number: order.orderNumber, is_test_order: order.isTestOrder } };
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

  async getLatestOrder(userId: string) {
    if (!userId) return { success: false, message: '用户ID不能为空', data: null };
    
    // 获取用户信息，判断是否为测试用户
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { success: false, message: '用户不存在', data: null };
    }
    
    const latestOrder = await this.prisma.order.findFirst({
      where: { 
        userId, 
        isDeleted: false,
        // 测试用户只能看到测试订单，正式用户只能看到正式订单
        isTestOrder: user.isTestUser || false
      },
      orderBy: { createdAt: 'desc' },
      include: {
        feedbacks: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    
    if (!latestOrder) {
      return { success: true, message: '没有找到订单记录', data: null };
    }
    
    // 增强订单数据，包括显示状态
    const enhancedOrder = enhanceOrderWithDisplayStatus({
      ...latestOrder,
      arrivalImageUrl: latestOrder.arrivalImageUrl,
      arrivalImageTakenAt: latestOrder.arrivalImageTakenAt,
      arrivalImageSource: latestOrder.arrivalImageSource,
      // 从 metadata 中提取 ETA 信息
      etaEstimatedAt: (latestOrder as any)?.metadata?.eta_estimated_at || null,
      etaSource: (latestOrder as any)?.metadata?.eta_source || null,
      // 提取订单数据用于前端恢复表单
      orderData: {
        address: latestOrder.deliveryAddress,
        deliveryTime: latestOrder.deliveryTime,
        allergies: latestOrder.dietaryRestrictions ? JSON.parse(latestOrder.dietaryRestrictions) : [],
        preferences: latestOrder.foodPreferences ? JSON.parse(latestOrder.foodPreferences) : [],
        foodType: (latestOrder.metadata as any)?.foodType || [],
        budget: latestOrder.budgetAmount?.toString() || '',
        selectedAddressSuggestion: null, // TODO: 如果需要可以从 metadata 中提取
      }
    });
    
    return { success: true, message: 'OK', data: enhancedOrder };
  }

  async getUserOrders(userId: string) {
    if (!userId) return { success: false, message: '用户ID不能为空' };
    
    // 获取用户信息，判断是否为测试用户
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { success: false, message: '用户不存在' };
    }
    
    // 添加调试日志
    console.log(`[getUserOrders] 查询${user.isTestUser ? '测试' : '正式'}用户订单 - userId: ${userId}`);
    
    const orders = await this.prisma.order.findMany({
      where: { 
        userId, 
        isDeleted: false,
        // 测试用户只能看到测试订单，正式用户只能看到正式订单
        isTestOrder: user.isTestUser || false
      },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        feedbacks: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    
    console.log(`[getUserOrders] 找到 ${orders.length} 个${user.isTestUser ? '测试' : '正式'}订单`);
    
    // 打印最新的几个订单信息用于调试
    if (orders.length > 0) {
      console.log(`[getUserOrders] 最新订单:`, {
        id: orders[0].id.substring(0, 8),
        status: orders[0].status,
        createdAt: orders[0].createdAt,
        isDeleted: orders[0].isDeleted,
        isTestOrder: orders[0].isTestOrder,
      });
    }
    
    // Include arrival image URL and displayStatus in response
    const ordersWithEnhancedData = orders.map(order => enhanceOrderWithDisplayStatus({
      ...order,
      arrivalImageUrl: order.arrivalImageUrl,
      arrivalImageTakenAt: order.arrivalImageTakenAt,
      arrivalImageSource: order.arrivalImageSource,
      // derive ETA from metadata if present
      etaEstimatedAt: (order as any)?.metadata?.eta_estimated_at || null,
      etaSource: (order as any)?.metadata?.eta_source || null,
    }));
    
    return { success: true, message: 'OK', data: { orders: ordersWithEnhancedData, count: orders.length } };
  }

  async listOrders(userId: string, filters: { status?: string }, paging: { page: number; pageSize: number }) {
    // 获取用户信息，判断是否为测试用户
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { items: [], page: paging.page, page_size: paging.pageSize, total: 0 };
    }
    
    const where: any = { 
      userId, 
      isDeleted: false,
      // 测试用户只能看到测试订单，正式用户只能看到正式订单
      isTestOrder: user.isTestUser || false
    };
    if (filters.status) where.status = filters.status;
    const skip = (paging.page - 1) * paging.pageSize;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: paging.pageSize }),
      this.prisma.order.count({ where }),
    ]);
    const mapped = items.map((order) => enhanceOrderWithDisplayStatus({
      ...order,
      etaEstimatedAt: (order as any)?.metadata?.eta_estimated_at || null,
      etaSource: (order as any)?.metadata?.eta_source || null,
    }));
    return { items: mapped, page: paging.page, page_size: paging.pageSize, total };
  }

  private generateOrderNumber() {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD${today}${rand}`;
  }

  async adminListOrders(params: { since?: string; status?: string; limit: number }) {
    const where: any = { isDeleted: false };
    if (params.status && params.status !== 'all') where.status = params.status;
    if (params.since) {
      const d = new Date(params.since);
      if (!isNaN(d.getTime())) where.createdAt = { gt: d };
    }
    const rows = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit,
      include: {
        user: { select: { userSequence: true } },
        feedbacks: { orderBy: { createdAt: 'desc' }, take: 1, select: { rating: true, comment: true, createdAt: true } },
        _count: { select: { voiceFeedbacks: true } },
      },
    });
    const items = rows.map((r) => {
      const baseOrder = {
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
        etaEstimatedAt: (r as any)?.metadata?.eta_estimated_at || null,
        etaSource: (r as any)?.metadata?.eta_source || null,
        userSequence: (r as any).user?.userSequence ?? null,
        latestFeedbackRating: (r as any).feedbacks?.[0]?.rating ?? null,
        latestFeedbackComment: (r as any).feedbacks?.[0]?.comment ?? null,
        latestFeedbackAt: (r as any).feedbacks?.[0]?.createdAt ?? null,
        voiceFeedbackCount: (r as any)?._count?.voiceFeedbacks ?? 0,
      };
      return enhanceOrderWithDisplayStatus(baseOrder);
    });
    const next_since = items.length > 0 ? new Date(items[0].createdAt).toISOString() : params.since || null;
    return { items, next_since };
  }

  async adminUpdateOrderStatus(orderId: string, status: string) {
    // 保持向后兼容，允许所有原有状态
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
    
    // 广播订单状态变更事件
    this.ordersGateway.broadcastOrderStatusChanged(orderId, updated.userId, {
      orderId,
      status,
      type: 'status_changed',
      message: `订单状态已更新为: ${status}`,
      updatedAt: updated.updatedAt.toISOString()
    });
    
    // 返回包含displayStatus的数据
    const enhancedOrder = enhanceOrderWithDisplayStatus(updated);
    return { success: true, message: '状态已更新', data: { 
      id: enhancedOrder.id, 
      status: enhancedOrder.status,
      displayStatus: enhancedOrder.displayStatus 
    } };
  }

  async adminGetOrderDetail(orderId: string) {
    if (!orderId) return null;
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        feedbacks: { orderBy: { createdAt: 'desc' } },
        voiceFeedbacks: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!order) return null;
    const payments = await this.prisma.payment.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: 'desc' },
    });
    
    // 增强订单数据，包含displayStatus
    return enhanceOrderWithDisplayStatus({
      ...order,
      etaEstimatedAt: (order as any)?.metadata?.eta_estimated_at || null,
      etaSource: (order as any)?.metadata?.eta_source || null,
      payments,
    });
  }

  async updateOrderEta(orderId: string, etaIso?: string | null, source?: string | null) {
    if (!orderId) return { success: false, message: '订单ID不能为空' };
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return { success: false, message: '订单不存在' };
    const nextMeta = { ...(order as any).metadata };
    if (etaIso) {
      const dt = new Date(etaIso);
      if (isNaN(dt.getTime())) return { success: false, message: 'ETA时间格式无效' };
      (nextMeta as any).eta_estimated_at = dt.toISOString();
    } else {
      delete (nextMeta as any).eta_estimated_at;
    }
    if (source !== undefined) (nextMeta as any).eta_source = source || null;
    await this.prisma.order.update({ where: { id: orderId }, data: { metadata: nextMeta, updatedAt: new Date() } });
    return { success: true, message: 'ETA已更新', data: { eta_estimated_at: (nextMeta as any).eta_estimated_at || null, eta_source: (nextMeta as any).eta_source || null } };
  }

  async getUserOrderEta(orderId: string, userId: string) {
    if (!orderId || !userId) return { success: false, message: '参数错误' };
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return { success: false, message: '订单不存在' };
    if (order.userId !== userId) return { success: false, message: '您无权查看此订单' };
    return { success: true, data: { eta_estimated_at: (order as any)?.metadata?.eta_estimated_at || null, eta_source: (order as any)?.metadata?.eta_source || null } };
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

    // 广播送达事件
    this.ordersGateway.broadcastOrderDelivered(orderId, updatedOrder.userId, data.image_url);

    // 广播订单状态变更事件
    this.ordersGateway.broadcastOrderStatusChanged(orderId, updatedOrder.userId, {
      orderId,
      status: 'completed',
      type: 'delivered',
      message: "已送达，骑手已提供存放位置图片",
      arrivalImageUrl: data.image_url,
      updatedAt: updatedOrder.updatedAt.toISOString()
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

    // 广播送达事件
    this.ordersGateway.broadcastOrderDelivered(updatedOrder.id, updatedOrder.userId, data.image_url);

    // 广播订单状态变更事件
    this.ordersGateway.broadcastOrderStatusChanged(updatedOrder.id, updatedOrder.userId, {
      orderId: updatedOrder.id,
      status: 'completed',
      type: 'delivered',
      message: "已送达，骑手已提供存放位置图片",
      arrivalImageUrl: data.image_url,
      updatedAt: updatedOrder.updatedAt.toISOString()
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

  // Admin method: Set order to selecting status
  async adminSetOrderSelecting(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return { success: false, message: '订单不存在' };

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'processing', updatedAt: new Date() },
    });

    // 广播订单状态变更事件
    this.ordersGateway.broadcastOrderStatusChanged(orderId, updated.userId, {
      orderId,
      status: 'processing',
      type: 'status_changed',
      message: '正在挑选...',
      updatedAt: updated.updatedAt.toISOString()
    });

    return { success: true, message: '订单状态已设置为挑选中' };
  }

  // Admin method: Set order ETA
  async adminSetOrderETA(orderId: string, estimatedDeliveryTime: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return { success: false, message: '订单不存在' };

    // 使用metadata存储ETA信息，与现有updateOrderEta方法保持一致
    const nextMeta = { ...(order as any).metadata };
    nextMeta.eta_display = estimatedDeliveryTime; // 显示格式，如 "18:30-19:00"
    nextMeta.eta_estimated_at = new Date().toISOString(); // 设置时间
    nextMeta.eta_source = 'admin';

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { 
        metadata: nextMeta,
        status: 'delivering', // 设置ETA时自动更改状态为delivering
        updatedAt: new Date() 
      },
    });

    // 广播ETA设置事件
    this.ordersGateway.broadcastOrderETASet(orderId, updated.userId, estimatedDeliveryTime);

    // 广播订单状态变更事件
    this.ordersGateway.broadcastOrderStatusChanged(orderId, updated.userId, {
      orderId,
      status: 'delivering',
      type: 'eta_set',
      message: `点好了，预计送达时间为${estimatedDeliveryTime}，我在持续跟进送达情况，请保持手机畅通`,
      estimatedDeliveryTime,
      updatedAt: updated.updatedAt.toISOString()
    });

    return { success: true, message: 'ETA已设置' };
  }

  // Admin method: Set order as delivered
  async adminSetOrderDelivered(orderId: string, arrivalImageUrl: string, takenAt?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return { success: false, message: '订单不存在' };

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { 
        status: 'completed',
        arrivalImageUrl,
        arrivalImageTakenAt: takenAt ? new Date(takenAt) : new Date(),
        arrivalImageSource: 'admin_upload',
        updatedAt: new Date() 
      },
    });

    // 广播送达事件
    this.ordersGateway.broadcastOrderDelivered(orderId, updated.userId, arrivalImageUrl);

    // 广播订单状态变更事件
    this.ordersGateway.broadcastOrderStatusChanged(orderId, updated.userId, {
      orderId,
      status: 'completed',
      type: 'delivered',
      message: arrivalImageUrl 
        ? "已送达，骑手已提供存放位置图片"
        : "已送达，骑手未提供存放位置图片，请在周围找找～",
      arrivalImageUrl,
      updatedAt: updated.updatedAt.toISOString()
    });

    return { success: true, message: '订单已标记为送达' };
  }
}
