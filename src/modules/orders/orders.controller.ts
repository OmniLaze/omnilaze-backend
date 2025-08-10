import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('/v1')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post('/create-order')
  @UseGuards(JwtAuthGuard)
  async create(@Body() body: { user_id: string; phone_number: string; form_data: any }) {
    const res = await this.orders.createOrder(body.user_id, body.phone_number, body.form_data);
    return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message, data: res.data };
  }

  @Post('/submit-order')
  @UseGuards(JwtAuthGuard)
  async submit(@Body() body: { order_id: string }) {
    const res = await this.orders.submitOrder(body.order_id);
    return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message, data: res.data };
  }

  @Post('/order-feedback')
  @UseGuards(JwtAuthGuard)
  async feedback(@Body() body: { order_id: string; rating: number; feedback?: string }) {
    const res = await this.orders.updateOrderFeedback(body.order_id, body.rating, body.feedback);
    return { success: res.success, code: res.success ? 'OK' : 'ERROR', message: res.message };
  }

  @Get('/orders/:userId')
  @UseGuards(JwtAuthGuard)
  async list(@Param('userId') userId: string) {
    const res = await this.orders.getUserOrders(userId);
    return { success: res.success, code: res.success ? 'OK' : 'ERROR', data: res.data, message: res.message };
  }

  @Get('/orders')
  @UseGuards(JwtAuthGuard)
  async history(
    @Query('user_id') userId: string,
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('page_size') pageSize = '20',
  ) {
    const res = await this.orders.listOrders(userId, { status }, { page: Number(page), pageSize: Number(pageSize) });
    return { success: true, code: 'OK', data: res };
  }
}


