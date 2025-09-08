import { Body, Controller, Get, Param, Post, Put, Query, UseGuards, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiConsumes, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AdminOrSystemKeyGuard } from '../../common/guards/admin-or-system-key.guard';
import { OrdersService } from '../orders/orders.service';
import { OrdersGateway } from '../orders/orders.gateway';
import { PrismaService } from '../../db/prisma.service';

@ApiTags('Admin Orders')
@Controller('/v1/admin/orders')
export class AdminOrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly ordersGateway: OrdersGateway,
    private readonly prisma: PrismaService
  ) {}

  @Post('/create-test')
  @UseGuards(AdminOrSystemKeyGuard)
  @ApiOperation({ summary: 'Create a test order for testing purposes' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        user_id: { type: 'string', description: 'User ID' },
        phone_number: { type: 'string', description: 'User phone number' },
        order_data: {
          type: 'object',
          properties: {
            address: { type: 'string', description: 'Delivery address' },
            deliveryTime: { type: 'string', description: 'Delivery time preference' },
            allergies: { type: 'array', items: { type: 'string' }, description: 'Food allergies' },
            preferences: { type: 'array', items: { type: 'string' }, description: 'Food preferences' },
            budget: { type: 'string', description: 'Budget amount' },
            foodType: { type: 'array', items: { type: 'string' }, description: 'Food type (food/drink)' },
          }
        },
        auto_pay: { type: 'boolean', description: 'Automatically mark as paid', default: true }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Test order created successfully' })
  async createTestOrder(@Body() body: {
    user_id: string;
    phone_number: string;
    order_data: any;
    auto_pay?: boolean;
  }) {
    try {
      // 创建订单
      const orderResult = await this.ordersService.createOrder(
        body.user_id,
        body.phone_number,
        body.order_data
      );

      if (!orderResult.success) {
        return { success: false, code: 'CREATE_FAILED', message: orderResult.message };
      }

      const orderId = orderResult.data?.order_id;
      if (!orderId) {
        return { success: false, code: 'NO_ORDER_ID', message: 'Order creation succeeded but no ID returned' };
      }

      // 提交订单
      const submitResult = await this.ordersService.submitOrder(orderId, body.user_id);
      if (!submitResult.success) {
        return { success: false, code: 'SUBMIT_FAILED', message: submitResult.message };
      }

      let finalOrder = null;

      // 如果指定自动支付，标记为已支付
      if (body.auto_pay !== false) {
        await this.prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'paid',
            paidAt: new Date(),
            updatedAt: new Date()
          }
        });

        // 获取更新后的订单信息
        finalOrder = await this.prisma.order.findUnique({
          where: { id: orderId },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            paidAt: true,
            deliveryAddress: true,
            budgetAmount: true,
            userId: true
          }
        });

        // 广播支付成功事件
        this.ordersGateway.broadcastPaymentUpdated(orderId, body.user_id, {
          orderId,
          paymentStatus: 'paid',
          updatedAt: new Date().toISOString()
        });
      }

      return {
        success: true,
        code: 'OK',
        message: '测试订单创建成功',
        data: {
          order_id: orderId,
          order_number: orderResult.data?.order_number,
          final_order: finalOrder
        }
      };
    } catch (error) {
      console.error('Create test order error:', error);
      return {
        success: false,
        code: 'ERROR',
        message: error instanceof Error ? error.message : '创建测试订单失败'
      };
    }
  }

  @Put('/:orderId/set-eta')
  @UseGuards(AdminOrSystemKeyGuard)
  @ApiOperation({ summary: 'Set ETA for an order' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        estimated_delivery_time: { type: 'string', description: 'ISO datetime string for delivery ETA' },
        source: { type: 'string', description: 'Source of ETA (nexus, system, etc.)', default: 'nexus' }
      }
    }
  })
  async setOrderETA(@Param('orderId') orderId: string, @Body() body: {
    estimated_delivery_time: string;
    source?: string;
  }) {
    try {
      // 验证订单存在
      const order = await this.prisma.order.findUnique({ where: { id: orderId } });
      if (!order) {
        return { success: false, code: 'NOT_FOUND', message: '订单不存在' };
      }

      // 更新ETA
      const result = await this.ordersService.updateOrderEta(
        orderId,
        body.estimated_delivery_time,
        body.source || 'nexus'
      );

      if (!result.success) {
        return { success: false, code: 'UPDATE_FAILED', message: result.message };
      }

      // 广播ETA设置事件
      const etaTime = new Date(body.estimated_delivery_time).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Shanghai'
      });

      this.ordersGateway.broadcastOrderETASet(orderId, order.userId, etaTime);

      return {
        success: true,
        code: 'OK',
        message: 'ETA已设置',
        data: {
          estimated_delivery_time: body.estimated_delivery_time,
          formatted_time: etaTime
        }
      };
    } catch (error) {
      console.error('Set ETA error:', error);
      return {
        success: false,
        code: 'ERROR',
        message: error instanceof Error ? error.message : '设置ETA失败'
      };
    }
  }

  @Put('/:orderId/set-delivered')
  @UseGuards(AdminOrSystemKeyGuard)
  @ApiOperation({ summary: 'Mark order as delivered' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        arrival_image_url: { type: 'string', description: 'URL of arrival image (optional)' },
        source: { type: 'string', description: 'Source of delivery confirmation', default: 'nexus' }
      }
    }
  })
  async setOrderDelivered(@Param('orderId') orderId: string, @Body() body: {
    arrival_image_url?: string;
    source?: string;
  }) {
    try {
      // 验证订单存在
      const order = await this.prisma.order.findUnique({ where: { id: orderId } });
      if (!order) {
        return { success: false, code: 'NOT_FOUND', message: '订单不存在' };
      }

      // 更新订单状态和到达图片
      const updateData: any = {
        status: 'delivered',
        updatedAt: new Date(),
      };

      if (body.arrival_image_url) {
        updateData.arrivalImageUrl = body.arrival_image_url;
        updateData.arrivalImageSource = body.source || 'nexus';
        updateData.arrivalImageTakenAt = new Date();
        updateData.arrivalImageImportedAt = new Date();
      }

      await this.prisma.order.update({
        where: { id: orderId },
        data: updateData
      });

      // 广播送达事件
      this.ordersGateway.broadcastOrderDelivered(orderId, order.userId, body.arrival_image_url);

      return {
        success: true,
        code: 'OK',
        message: '订单已标记为送达',
        data: {
          order_id: orderId,
          status: 'delivered',
          arrival_image_url: body.arrival_image_url || null
        }
      };
    } catch (error) {
      console.error('Set delivered error:', error);
      return {
        success: false,
        code: 'ERROR',
        message: error instanceof Error ? error.message : '标记送达失败'
      };
    }
  }

  @Get('/')
  @UseGuards(AdminOrSystemKeyGuard)
  @ApiOperation({ summary: 'List orders with admin privileges' })
  @ApiQuery({ name: 'status', description: 'Filter by order status', required: false })
  @ApiQuery({ name: 'since', description: 'Get orders since timestamp', required: false })
  @ApiQuery({ name: 'limit', description: 'Number of orders to return', required: false })
  async listOrders(@Query() params: {
    status?: string;
    since?: string;
    limit?: string;
  }) {
    try {
      const result = await this.ordersService.adminListOrders({
        status: params.status,
        since: params.since,
        limit: params.limit ? parseInt(params.limit) : 50
      });

      return {
        success: true,
        code: 'OK',
        data: result
      };
    } catch (error) {
      console.error('List orders error:', error);
      return {
        success: false,
        code: 'ERROR',
        message: error instanceof Error ? error.message : '获取订单列表失败'
      };
    }
  }

  @Get('/:orderId')
  @UseGuards(AdminOrSystemKeyGuard)
  @ApiOperation({ summary: 'Get order details with admin privileges' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  async getOrderDetail(@Param('orderId') orderId: string) {
    try {
      const order = await this.ordersService.adminGetOrderDetail(orderId);
      if (!order) {
        return { success: false, code: 'NOT_FOUND', message: '订单不存在' };
      }

      return {
        success: true,
        code: 'OK',
        data: order
      };
    } catch (error) {
      console.error('Get order detail error:', error);
      return {
        success: false,
        code: 'ERROR',
        message: error instanceof Error ? error.message : '获取订单详情失败'
      };
    }
  }
}