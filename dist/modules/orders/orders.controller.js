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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const orders_service_1 = require("./orders.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const system_key_guard_1 = require("../../common/guards/system-key.guard");
const admin_or_system_key_guard_1 = require("../../common/guards/admin-or-system-key.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const orders_dto_1 = require("./dto/orders.dto");
let OrdersController = class OrdersController {
    constructor(orders) {
        this.orders = orders;
    }
    async create(userId, phoneNumber, body) {
        // Use the user ID from JWT, not from request body
        const res = await this.orders.createOrder(userId, phoneNumber, body.form_data);
        return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message, data: res.data };
    }
    async submit(userId, body) {
        // Verify order ownership before submitting
        const res = await this.orders.submitOrder(body.order_id, userId);
        return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message, data: res.data };
    }
    async feedback(userId, body) {
        // Verify order ownership before accepting feedback
        const res = await this.orders.updateOrderFeedback(body.order_id, userId, body.rating, body.feedback);
        return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message };
    }
    async getLatest(userId) {
        const res = await this.orders.getLatestOrder(userId);
        return { success: res.success, code: res.success ? 'OK' : 'ERROR', data: res.data, message: res.message };
    }
    async list(currentUserId, userId) {
        // Users can only view their own orders
        if (currentUserId !== userId) {
            throw new common_1.ForbiddenException('您无权查看其他用户的订单');
        }
        const res = await this.orders.getUserOrders(userId);
        return { success: res.success, code: res.success ? 'OK' : 'ERROR', data: res.data, message: res.message };
    }
    async history(currentUserId, userId, status, page = '1', pageSize = '20') {
        // Use current user's ID, ignore user_id from query
        const actualUserId = currentUserId; // Always use JWT user ID
        const res = await this.orders.listOrders(actualUserId, { status }, { page: Number(page), pageSize: Number(pageSize) });
        return { success: true, code: 'OK', data: res };
    }
    async importArrivalImage(orderId, body) {
        const res = await this.orders.importArrivalImage(orderId, body);
        return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message, data: res.data };
    }
    async importArrivalImageByNumber(body) {
        const res = await this.orders.importArrivalImageByNumber(body);
        return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message, data: res.data };
    }
    // Admin alias: import arrival image by URL
    async adminImportArrivalImage(orderId, body) {
        const res = await this.orders.importArrivalImage(orderId, body);
        return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message, data: res.data };
    }
    async adminUploadArrivalImage(orderId, file) {
        if (!file)
            return { success: false, code: 'ERROR', message: '图片文件不能为空' };
        const dataUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        const res = await this.orders.importArrivalImage(orderId, { image_url: dataUrl, source: 'admin_upload' });
        return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message, data: res.data };
    }
    async getArrivalImage(userId, orderId) {
        // Verify order ownership before returning arrival image
        const res = await this.orders.getArrivalImage(orderId, userId);
        return { success: res.success, code: res.success ? 'OK' : 'ERROR', data: res.data };
    }
    async uploadVoiceFeedback(orderId, file, userId, body) {
        if (!file) {
            return { success: false, code: 'ERROR', message: '音频文件不能为空' };
        }
        // For now, we'll save the file as a base64 URL
        // In production, you'd upload to S3/OSS and get a real URL
        const audioUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        const res = await this.orders.uploadVoiceFeedback(orderId, {
            audioUrl,
            userId: userId, // Use userId from JWT
            durationSec: body.duration_sec ? parseInt(body.duration_sec) : undefined,
            transcript: body.transcript,
        });
        return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message, data: res.data };
    }
    // Admin: list recent orders across all users (incremental polling)
    async adminList(since, status, limit = '50') {
        const lim = Math.max(1, Math.min(200, Number(limit) || 50));
        const res = await this.orders.adminListOrders({ since: since || undefined, status: status || undefined, limit: lim });
        return { success: true, code: 'OK', data: res };
    }
    async adminGetOne(orderId) {
        const res = await this.orders.adminGetOrderDetail(orderId);
        if (!res)
            return { success: false, code: 'NOT_FOUND', message: 'Order not found' };
        return { success: true, code: 'OK', data: res };
    }
    async adminUpdateStatus(orderId, body) {
        const status = (body?.status || '').trim();
        if (!status)
            return { success: false, code: 'INVALID', message: '状态不能为空' };
        const result = await this.orders.adminUpdateOrderStatus(orderId, status);
        return { success: result.success, code: result.success ? 'OK' : 'ERROR', message: result.message, data: result.data };
    }
    async adminUpdateEta(orderId, body) {
        let etaIso = body.eta_at || undefined;
        if (!etaIso && typeof body.minutes === 'number') {
            const base = new Date();
            etaIso = new Date(base.getTime() + Math.max(0, body.minutes) * 60 * 1000).toISOString();
        }
        const result = await this.orders.updateOrderEta(orderId, etaIso, body.source);
        return { success: result.success, code: result.success ? 'OK' : 'ERROR', message: result.message, data: result.data };
    }
    async getEta(userId, orderId) {
        const res = await this.orders.getUserOrderEta(orderId, userId);
        return { success: res.success, code: res.success ? 'OK' : 'ERROR', data: res.data, message: res.message };
    }
    // Missing Nexus admin endpoints
    async adminSetSelecting(orderId) {
        const res = await this.orders.adminSetOrderSelecting(orderId);
        return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message };
    }
    async adminSetETA(orderId, body) {
        if (!body.estimated_delivery_time) {
            return { success: false, code: 'INVALID', message: '预计送达时间不能为空' };
        }
        const res = await this.orders.adminSetOrderETA(orderId, body.estimated_delivery_time);
        return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message };
    }
    async adminSetDelivered(orderId, body) {
        if (!body.arrival_image_url) {
            return { success: false, code: 'INVALID', message: '到达图片URL不能为空' };
        }
        const res = await this.orders.adminSetOrderDelivered(orderId, body.arrival_image_url, body.taken_at);
        return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message };
    }
};
exports.OrdersController = OrdersController;
__decorate([
    (0, common_1.Post)('/create-order'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new order', description: 'Create a new order with user preferences and delivery details' }),
    (0, swagger_1.ApiBody)({ type: orders_dto_1.CreateOrderDto }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Order created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid form data' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('phone')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, orders_dto_1.CreateOrderDto]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('/submit-order'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Submit an order', description: 'Submit a draft order for processing' }),
    (0, swagger_1.ApiBody)({ type: orders_dto_1.SubmitOrderDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Order submitted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Order does not belong to user' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Order not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, orders_dto_1.SubmitOrderDto]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "submit", null);
__decorate([
    (0, common_1.Post)('/order-feedback'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Submit order feedback', description: 'Submit rating and feedback for a completed order' }),
    (0, swagger_1.ApiBody)({ type: orders_dto_1.OrderFeedbackDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Feedback submitted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Order does not belong to user' }),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, orders_dto_1.OrderFeedbackDto]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "feedback", null);
__decorate([
    (0, common_1.Get)('/orders/latest'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get latest user order', description: 'Get the most recent order for the current user' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Latest order retrieved successfully' }),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getLatest", null);
__decorate([
    (0, common_1.Get)('/orders/:userId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get user orders', description: 'Get all orders for a specific user' }),
    (0, swagger_1.ApiParam)({ name: 'userId', description: 'User ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Orders retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Cannot view other users orders' }),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('/orders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get order history', description: 'Get paginated order history for current user' }),
    (0, swagger_1.ApiQuery)({ name: 'user_id', description: 'User ID (ignored, uses JWT)', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'status', description: 'Filter by order status', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'page', description: 'Page number', required: false, example: '1' }),
    (0, swagger_1.ApiQuery)({ name: 'page_size', description: 'Page size', required: false, example: '20' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Order history retrieved successfully' }),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Query)('user_id')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('page_size')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "history", null);
__decorate([
    (0, common_1.Post)('/orders/:orderId/arrival-image/import'),
    (0, common_1.UseGuards)(system_key_guard_1.SystemKeyGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Import arrival image', description: 'Import arrival image for an order (Admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'orderId', description: 'Order ID' }),
    (0, swagger_1.ApiBody)({ type: orders_dto_1.ImportArrivalImageDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Arrival image imported successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'System key required' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Order not found' }),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, orders_dto_1.ImportArrivalImageDto]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "importArrivalImage", null);
__decorate([
    (0, common_1.Post)('/orders/arrival-image/import-by-number'),
    (0, common_1.UseGuards)(system_key_guard_1.SystemKeyGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Import arrival image by order number', description: 'Import arrival image using order number (Admin only)' }),
    (0, swagger_1.ApiBody)({ type: orders_dto_1.ImportArrivalImageByNumberDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Arrival image imported successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'System key required' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Order not found' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [orders_dto_1.ImportArrivalImageByNumberDto]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "importArrivalImageByNumber", null);
__decorate([
    (0, common_1.Post)('/admin/orders/:orderId/arrival-image/import'),
    (0, common_1.UseGuards)(admin_or_system_key_guard_1.AdminOrSystemKeyGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Admin import arrival image', description: 'Import arrival image for an order by URL (admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'orderId', description: 'Order ID' }),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, orders_dto_1.ImportArrivalImageDto]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "adminImportArrivalImage", null);
__decorate([
    (0, common_1.Post)('/admin/orders/:orderId/arrival-image/upload'),
    (0, common_1.UseGuards)(admin_or_system_key_guard_1.AdminOrSystemKeyGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
        fileFilter: (req, file, cb) => {
            const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
            if (allowed.includes(file.mimetype))
                cb(null, true);
            else
                cb(new Error('Only image files are allowed'), false);
        }
    })),
    (0, swagger_1.ApiOperation)({ summary: 'Admin upload arrival image', description: 'Upload an arrival image file for an order (admin only)' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiParam)({ name: 'orderId', description: 'Order ID' }),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "adminUploadArrivalImage", null);
__decorate([
    (0, common_1.Get)('/orders/:orderId/arrival-image'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get arrival image', description: 'Get arrival image for an order' }),
    (0, swagger_1.ApiParam)({ name: 'orderId', description: 'Order ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Arrival image retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Order does not belong to user' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Order not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getArrivalImage", null);
__decorate([
    (0, common_1.Post)('/orders/:orderId/feedback/audio'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
        fileFilter: (req, file, cb) => {
            // Accept common audio formats
            const allowedMimes = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg'];
            if (allowedMimes.includes(file.mimetype)) {
                cb(null, true);
            }
            else {
                cb(new Error('Invalid file type. Only audio files are allowed.'), false);
            }
        },
    })),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, current_user_decorator_1.CurrentUserId)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "uploadVoiceFeedback", null);
__decorate([
    (0, common_1.Get)('/admin/orders'),
    (0, common_1.UseGuards)(admin_or_system_key_guard_1.AdminOrSystemKeyGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Admin list orders', description: 'List recent orders across all users with optional incremental filter' }),
    (0, swagger_1.ApiQuery)({ name: 'since', required: false, description: 'Only return orders created after this ISO timestamp' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, description: 'Filter by order status' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, description: 'Max number of records to return (1-200)', example: '50' }),
    __param(0, (0, common_1.Query)('since')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "adminList", null);
__decorate([
    (0, common_1.Get)('/admin/orders/:orderId'),
    (0, common_1.UseGuards)(admin_or_system_key_guard_1.AdminOrSystemKeyGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Admin get order detail', description: 'Get full order detail including relations' }),
    (0, swagger_1.ApiParam)({ name: 'orderId', description: 'Order ID' }),
    __param(0, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "adminGetOne", null);
__decorate([
    (0, common_1.Post)('/admin/orders/:orderId/status'),
    (0, common_1.UseGuards)(admin_or_system_key_guard_1.AdminOrSystemKeyGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Admin update order status', description: 'Update order status for given order' }),
    (0, swagger_1.ApiParam)({ name: 'orderId', description: 'Order ID' }),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "adminUpdateStatus", null);
__decorate([
    (0, common_1.Post)('/admin/orders/:orderId/eta'),
    (0, common_1.UseGuards)(admin_or_system_key_guard_1.AdminOrSystemKeyGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Admin update order ETA', description: 'Update ETA (estimated arrival time) for an order' }),
    (0, swagger_1.ApiParam)({ name: 'orderId', description: 'Order ID' }),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "adminUpdateEta", null);
__decorate([
    (0, common_1.Get)('/orders/:orderId/eta'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get user order ETA', description: 'Get ETA for a specific order (user-owned)' }),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getEta", null);
__decorate([
    (0, common_1.Post)('/admin/orders/:orderId/set-selecting'),
    (0, common_1.UseGuards)(admin_or_system_key_guard_1.AdminOrSystemKeyGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Admin set order selecting', description: 'Set order status to selecting (admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'orderId', description: 'Order ID' }),
    __param(0, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "adminSetSelecting", null);
__decorate([
    (0, common_1.Post)('/admin/orders/:orderId/set-eta'),
    (0, common_1.UseGuards)(admin_or_system_key_guard_1.AdminOrSystemKeyGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Admin set order ETA', description: 'Set estimated delivery time for an order (admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'orderId', description: 'Order ID' }),
    (0, swagger_1.ApiBody)({ schema: {
            type: 'object',
            properties: {
                estimated_delivery_time: { type: 'string', example: '18:30-19:00' }
            },
            required: ['estimated_delivery_time']
        } }),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "adminSetETA", null);
__decorate([
    (0, common_1.Post)('/admin/orders/:orderId/set-delivered'),
    (0, common_1.UseGuards)(admin_or_system_key_guard_1.AdminOrSystemKeyGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Admin set order delivered', description: 'Mark order as delivered with optional arrival image (admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'orderId', description: 'Order ID' }),
    (0, swagger_1.ApiBody)({ schema: {
            type: 'object',
            properties: {
                arrival_image_url: { type: 'string' },
                taken_at: { type: 'string', format: 'date-time' }
            },
            required: ['arrival_image_url']
        } }),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "adminSetDelivered", null);
exports.OrdersController = OrdersController = __decorate([
    (0, swagger_1.ApiTags)('Orders'),
    (0, common_1.Controller)('/v1'),
    __metadata("design:paramtypes", [orders_service_1.OrdersService])
], OrdersController);
//# sourceMappingURL=orders.controller.js.map