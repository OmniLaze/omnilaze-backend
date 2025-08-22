import { Controller, Post, Get, Param, Body, UseGuards, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminOrSystemKeyGuard } from '../../common/guards/admin-or-system-key.guard';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../../db/prisma.service';

@ApiTags('Admin Payments')
@Controller('/v1/admin/payments')
@UseGuards(AdminOrSystemKeyGuard)
export class AdminPaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 获取支付列表
   */
  @Get()
  @ApiOperation({ summary: '获取支付列表' })
  async listPayments(
    @Query('order_id') orderId?: string,
    @Query('status') status?: string,
    @Query('provider') provider?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const where: any = {};
    
    if (orderId) {
      where.orderId = orderId;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (provider) {
      where.provider = provider;
    }
    
    // Note: Prisma schema currently does not define relations on Payment -> Order/Events.
    // Avoid `include` on non-declared relations to prevent runtime errors.
    const payments = await this.prisma.payment.findMany({
      where,
      take: parseInt(limit || '50'),
      skip: parseInt(offset || '0'),
      orderBy: { createdAt: 'desc' },
    } as any);

    // Enrich with minimal order info (best-effort) without relying on relations
    const orderIds = Array.from(new Set(payments.map((p: any) => p.orderId).filter(Boolean)));
    const orders = orderIds.length
      ? await this.prisma.order.findMany({
          where: { id: { in: orderIds } },
          select: { id: true, orderNumber: true, userId: true, deliveryAddress: true, budgetAmount: true },
        })
      : [];
    const orderMap = new Map(orders.map((o) => [o.id, o]));
    const enriched = payments.map((p: any) => ({
      ...p,
      order: p.orderId ? orderMap.get(p.orderId) || null : null,
    }));
    
    const total = await this.prisma.payment.count({ where });
    
    return {
      success: true,
      data: {
        items: enriched,
        total,
        limit: parseInt(limit || '50'),
        offset: parseInt(offset || '0'),
      },
    };
  }

  /**
   * 获取支付详情
   */
  @Get(':paymentId')
  @ApiOperation({ summary: '获取支付详情' })
  async getPaymentDetail(@Param('paymentId') paymentId: string) {
    // Fetch payment, order, and events separately to avoid relation includes
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } } as any);
    
    if (!payment) {
      throw new HttpException('支付记录不存在', HttpStatus.NOT_FOUND);
    }
    
    const [order, events] = await Promise.all([
      payment?.orderId ? this.prisma.order.findUnique({ where: { id: payment.orderId } }) : Promise.resolve(null),
      this.prisma.paymentEvent.findMany({ where: { paymentId }, orderBy: { createdAt: 'desc' } } as any),
    ]);

    return { success: true, data: { ...payment, order, events } };
  }

  /**
   * 申请退款
   */
  @Post(':paymentId/refund')
  @ApiOperation({ summary: '申请退款' })
  @ApiResponse({ status: 200, description: '退款成功' })
  @ApiResponse({ status: 400, description: '退款失败' })
  async refundPayment(
    @Param('paymentId') paymentId: string,
    @Body() body: {
      amount?: number; // 退款金额，不提供则全额退款
      reason?: string; // 退款原因
    },
  ) {
    try {
      // 调用支付服务进行退款
      const result = await this.paymentsService.refundPayment(
        paymentId,
        body.amount,
        body.reason,
      );
      
      return result;
    } catch (error: any) {
      throw new HttpException(
        error.message || '退款失败',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 查询退款状态
   */
  @Get(':paymentId/refund-status')
  @ApiOperation({ summary: '查询退款状态' })
  async getRefundStatus(@Param('paymentId') paymentId: string) {
    const payment = await (this.prisma.payment as any).findUnique({
      where: { id: paymentId },
    });
    
    if (!payment) {
      throw new HttpException('支付记录不存在', HttpStatus.NOT_FOUND);
    }
    
    return {
      success: true,
      data: {
        paymentId: payment.id,
        status: payment.status,
        originalAmount: payment.amount,
        refundedAmount: (payment.metadata as any)?.refundTotal || 0,
        refundedAt: payment.refundedAt,
        isFullyRefunded: payment.status === 'refunded',
        isPartiallyRefunded: payment.status === 'partial_refunded',
        refundInfo: (payment.metadata as any)?.refundInfo || null,
      },
    };
  }

  /**
   * 同步支付状态
   */
  @Post(':paymentId/sync-status')
  @ApiOperation({ summary: '同步支付状态' })
  async syncPaymentStatus(@Param('paymentId') paymentId: string) {
    const result = await this.paymentsService.queryPaymentStatus(paymentId);
    return result;
  }

  /**
   * 获取订单的所有支付记录
   */
  @Get('order/:orderId')
  @ApiOperation({ summary: '获取订单的所有支付记录' })
  async getOrderPayments(@Param('orderId') orderId: string) {
    // Do not include events relation (not declared in Prisma schema); fetch plain payments
    const payments = await this.prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    } as any);

    return {
      success: true,
      data: payments,
    };
  }

  /**
   * 批量退款
   */
  @Post('batch-refund')
  @ApiOperation({ summary: '批量退款' })
  async batchRefund(
    @Body() body: {
      paymentIds: string[];
      reason?: string;
    },
  ) {
    const results = [];
    
    for (const paymentId of body.paymentIds) {
      try {
        const result = await this.paymentsService.refundPayment(
          paymentId,
          undefined, // 全额退款
          body.reason,
        );
        results.push({
          paymentId,
          success: result.success,
          message: result.message,
          data: result.data,
        });
      } catch (error: any) {
        results.push({
          paymentId,
          success: false,
          message: error.message || '退款失败',
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    
    return {
      success: failedCount === 0,
      message: `成功退款 ${successCount} 笔，失败 ${failedCount} 笔`,
      data: {
        results,
        summary: {
          total: body.paymentIds.length,
          success: successCount,
          failed: failedCount,
        },
      },
    };
  }
}
