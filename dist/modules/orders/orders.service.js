"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../db/prisma.service");
let OrdersService = class OrdersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createOrder(userId, phoneNumber, formData) {
        if (!userId || !phoneNumber)
            return { success: false, message: '用户信息不能为空' };
        if (!formData?.address)
            return { success: false, message: '配送地址不能为空' };
        const budget = Number(formData?.budget ?? 0);
        if (Number.isNaN(budget) || budget < 0)
            return { success: false, message: '预算金额无效' };
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
    async submitOrder(orderId) {
        if (!orderId)
            return { success: false, message: '订单ID不能为空' };
        const order = await this.prisma.order.update({
            where: { id: orderId },
            data: { status: 'submitted', submittedAt: new Date(), updatedAt: new Date() },
        }).catch(() => null);
        if (!order)
            return { success: false, message: '订单不存在' };
        return { success: true, message: '订单提交成功', data: { order_number: order.orderNumber } };
    }
    async updateOrderFeedback(orderId, rating, feedback) {
        if (!orderId)
            return { success: false, message: '订单ID不能为空' };
        if (!Number.isInteger(rating) || rating < 1 || rating > 5)
            return { success: false, message: '评分必须在1-5之间' };
        const exists = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!exists)
            return { success: false, message: '订单不存在' };
        await this.prisma.orderFeedback.create({ data: { orderId, userId: exists.userId, rating, comment: feedback || null } });
        return { success: true, message: '反馈提交成功' };
    }
    async getUserOrders(userId) {
        if (!userId)
            return { success: false, message: '用户ID不能为空' };
        const orders = await this.prisma.order.findMany({
            where: { userId, isDeleted: false },
            orderBy: [{ createdAt: 'desc' }],
        });
        return { success: true, message: 'OK', data: { orders, count: orders.length } };
    }
    async listOrders(userId, filters, paging) {
        const where = { userId, isDeleted: false };
        if (filters.status)
            where.status = filters.status;
        const skip = (paging.page - 1) * paging.pageSize;
        const [items, total] = await this.prisma.$transaction([
            this.prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: paging.pageSize }),
            this.prisma.order.count({ where }),
        ]);
        return { items, page: paging.page, page_size: paging.pageSize, total };
    }
    generateOrderNumber() {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `ORD${today}${rand}`;
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map