import { Body, Controller, Get, Param, Post, Query, UseGuards, UseInterceptors, UploadedFile, ForbiddenException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiConsumes, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SystemKeyGuard } from '../../common/guards/system-key.guard';
import { AdminOrSystemKeyGuard } from '../../common/guards/admin-or-system-key.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser, CurrentUserId } from '../../common/decorators/current-user.decorator';
import { CreateOrderDto, SubmitOrderDto, OrderFeedbackDto, ImportArrivalImageDto, ImportArrivalImageByNumberDto, VoiceFeedbackDto } from './dto/orders.dto';

@ApiTags('Orders')
@Controller('/v1')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post('/create-order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new order', description: 'Create a new order with user preferences and delivery details' })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid form data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @CurrentUserId() userId: string,
    @CurrentUser('phone') phoneNumber: string,
    @Body() body: CreateOrderDto
  ) {
    // Use the user ID from JWT, not from request body
    const res = await this.orders.createOrder(userId, phoneNumber, body.form_data);
    return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message, data: res.data };
  }

  @Post('/submit-order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit an order', description: 'Submit a draft order for processing' })
  @ApiBody({ type: SubmitOrderDto })
  @ApiResponse({ status: 200, description: 'Order submitted successfully' })
  @ApiResponse({ status: 403, description: 'Order does not belong to user' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async submit(
    @CurrentUserId() userId: string,
    @Body() body: SubmitOrderDto
  ) {
    // Verify order ownership before submitting
    const res = await this.orders.submitOrder(body.order_id, userId);
    return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message, data: res.data };
  }

  @Post('/order-feedback')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit order feedback', description: 'Submit rating and feedback for a completed order' })
  @ApiBody({ type: OrderFeedbackDto })
  @ApiResponse({ status: 200, description: 'Feedback submitted successfully' })
  @ApiResponse({ status: 403, description: 'Order does not belong to user' })
  async feedback(
    @CurrentUserId() userId: string,
    @Body() body: OrderFeedbackDto
  ) {
    // Verify order ownership before accepting feedback
    const res = await this.orders.updateOrderFeedback(body.order_id, userId, body.rating, body.feedback);
    return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message };
  }

  @Get('/orders/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user orders', description: 'Get all orders for a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Cannot view other users orders' })
  async list(
    @CurrentUserId() currentUserId: string,
    @Param('userId') userId: string
  ) {
    // Users can only view their own orders
    if (currentUserId !== userId) {
      throw new ForbiddenException('您无权查看其他用户的订单');
    }
    const res = await this.orders.getUserOrders(userId);
    return { success: res.success, code: res.success ? 'OK' : 'ERROR', data: res.data, message: res.message };
  }

  @Get('/orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order history', description: 'Get paginated order history for current user' })
  @ApiQuery({ name: 'user_id', description: 'User ID (ignored, uses JWT)', required: false })
  @ApiQuery({ name: 'status', description: 'Filter by order status', required: false })
  @ApiQuery({ name: 'page', description: 'Page number', required: false, example: '1' })
  @ApiQuery({ name: 'page_size', description: 'Page size', required: false, example: '20' })
  @ApiResponse({ status: 200, description: 'Order history retrieved successfully' })
  async history(
    @CurrentUserId() currentUserId: string,
    @Query('user_id') userId: string,
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('page_size') pageSize = '20',
  ) {
    // Use current user's ID, ignore user_id from query
    const actualUserId = currentUserId; // Always use JWT user ID
    const res = await this.orders.listOrders(actualUserId, { status }, { page: Number(page), pageSize: Number(pageSize) });
    return { success: true, code: 'OK', data: res };
  }

  @Post('/orders/:orderId/arrival-image/import')
  @UseGuards(SystemKeyGuard)
  @ApiOperation({ summary: 'Import arrival image', description: 'Import arrival image for an order (Admin only)' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiBody({ type: ImportArrivalImageDto })
  @ApiResponse({ status: 200, description: 'Arrival image imported successfully' })
  @ApiResponse({ status: 401, description: 'System key required' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async importArrivalImage(
    @Param('orderId') orderId: string,
    @Body() body: ImportArrivalImageDto,
  ) {
    const res = await this.orders.importArrivalImage(orderId, body);
    return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message, data: res.data };
  }

  @Post('/orders/arrival-image/import-by-number')
  @UseGuards(SystemKeyGuard)
  @ApiOperation({ summary: 'Import arrival image by order number', description: 'Import arrival image using order number (Admin only)' })
  @ApiBody({ type: ImportArrivalImageByNumberDto })
  @ApiResponse({ status: 200, description: 'Arrival image imported successfully' })
  @ApiResponse({ status: 401, description: 'System key required' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async importArrivalImageByNumber(
    @Body() body: ImportArrivalImageByNumberDto,
  ) {
    const res = await this.orders.importArrivalImageByNumber(body);
    return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message, data: res.data };
  }

  // Admin alias: import arrival image by URL
  @Post('/admin/orders/:orderId/arrival-image/import')
  @UseGuards(AdminOrSystemKeyGuard)
  @ApiOperation({ summary: 'Admin import arrival image', description: 'Import arrival image for an order by URL (admin only)' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  async adminImportArrivalImage(
    @Param('orderId') orderId: string,
    @Body() body: ImportArrivalImageDto,
  ) {
    const res = await this.orders.importArrivalImage(orderId, body);
    return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message, data: res.data };
  }

  @Post('/admin/orders/:orderId/arrival-image/upload')
  @UseGuards(AdminOrSystemKeyGuard)
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
      if (allowed.includes(file.mimetype)) cb(null, true);
      else cb(new Error('Only image files are allowed'), false);
    }
  }))
  @ApiOperation({ summary: 'Admin upload arrival image', description: 'Upload an arrival image file for an order (admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  async adminUploadArrivalImage(
    @Param('orderId') orderId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) return { success: false, code: 'ERROR', message: '图片文件不能为空' };
    const dataUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    const res = await this.orders.importArrivalImage(orderId, { image_url: dataUrl, source: 'admin_upload' });
    return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message, data: res.data };
  }

  @Get('/orders/:orderId/arrival-image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get arrival image', description: 'Get arrival image for an order' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Arrival image retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Order does not belong to user' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getArrivalImage(
    @CurrentUserId() userId: string,
    @Param('orderId') orderId: string
  ) {
    // Verify order ownership before returning arrival image
    const res = await this.orders.getArrivalImage(orderId, userId);
    return { success: res.success, code: res.success ? 'OK' : 'ERROR', data: res.data };
  }

  @Post('/orders/:orderId/feedback/audio')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      // Accept common audio formats
      const allowedMimes = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only audio files are allowed.'), false);
      }
    },
  }))
  async uploadVoiceFeedback(
    @Param('orderId') orderId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUserId() userId: string,
    @Body() body: { duration_sec?: string; transcript?: string },
  ) {
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
  @Get('/admin/orders')
  @UseGuards(AdminOrSystemKeyGuard)
  @ApiOperation({ summary: 'Admin list orders', description: 'List recent orders across all users with optional incremental filter' })
  @ApiQuery({ name: 'since', required: false, description: 'Only return orders created after this ISO timestamp' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by order status' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max number of records to return (1-200)', example: '50' })
  async adminList(
    @Query('since') since?: string,
    @Query('status') status?: string,
    @Query('limit') limit = '50',
  ) {
    const lim = Math.max(1, Math.min(200, Number(limit) || 50));
    const res = await this.orders.adminListOrders({ since: since || undefined, status: status || undefined, limit: lim });
    return { success: true, code: 'OK', data: res };
  }

  @Get('/admin/orders/:orderId')
  @UseGuards(AdminOrSystemKeyGuard)
  @ApiOperation({ summary: 'Admin get order detail', description: 'Get full order detail including relations' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  async adminGetOne(@Param('orderId') orderId: string) {
    const res = await this.orders.adminGetOrderDetail(orderId);
    if (!res) return { success: false, code: 'NOT_FOUND', message: 'Order not found' };
    return { success: true, code: 'OK', data: res };
  }

  @Post('/admin/orders/:orderId/status')
  @UseGuards(AdminOrSystemKeyGuard)
  @ApiOperation({ summary: 'Admin update order status', description: 'Update order status for given order' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  async adminUpdateStatus(
    @Param('orderId') orderId: string,
    @Body() body: { status?: string },
  ) {
    const status = (body?.status || '').trim();
    if (!status) return { success: false, code: 'INVALID', message: '状态不能为空' };
    const result = await this.orders.adminUpdateOrderStatus(orderId, status);
    return { success: result.success, code: result.success ? 'OK' : 'ERROR', message: result.message, data: result.data };
  }

  @Post('/admin/orders/:orderId/eta')
  @UseGuards(AdminOrSystemKeyGuard)
  @ApiOperation({ summary: 'Admin update order ETA', description: 'Update ETA (estimated arrival time) for an order' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  async adminUpdateEta(
    @Param('orderId') orderId: string,
    @Body() body: { eta_at?: string; minutes?: number; source?: string },
  ) {
    let etaIso = body.eta_at || undefined;
    if (!etaIso && typeof body.minutes === 'number') {
      const base = new Date();
      etaIso = new Date(base.getTime() + Math.max(0, body.minutes) * 60 * 1000).toISOString();
    }
    const result = await this.orders.updateOrderEta(orderId, etaIso, body.source);
    return { success: result.success, code: result.success ? 'OK' : 'ERROR', message: result.message, data: result.data };
  }

  @Get('/orders/:orderId/eta')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user order ETA', description: 'Get ETA for a specific order (user-owned)' })
  async getEta(
    @CurrentUserId() userId: string,
    @Param('orderId') orderId: string,
  ) {
    const res = await this.orders.getUserOrderEta(orderId, userId);
    return { success: res.success, code: res.success ? 'OK' : 'ERROR', data: res.data, message: res.message };
  }
}
