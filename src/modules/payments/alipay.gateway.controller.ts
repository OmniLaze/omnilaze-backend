import { Controller, Post, Get, Body, Query, Req, Res, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { PaymentsService } from './payments.service';
import { AlipayProvider } from './providers/alipay.provider';
import { PrismaService } from '../../db/prisma.service';

/**
 * Alipay Gateway Controller
 * Provides web payment gateway endpoints for Alipay integration
 * These endpoints are designed for frontend redirect payment flows
 */
@Controller('/v1/alipay/gateway')
export class AlipayGatewayController {
  private readonly logger = new Logger(AlipayGatewayController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly alipayProvider: AlipayProvider,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Main gateway endpoint for initiating Alipay web/H5 payment
   * This endpoint creates a payment and returns the payment URL
   */
  @Post()
  async createWebPayment(@Body() body: {
    order_id: string;
    amount: number;
    subject?: string;
    return_url?: string;
    notify_url?: string;
    payment_method?: 'page' | 'wap'; // page for PC, wap for mobile H5
  }) {
    try {
      this.logger.log(`Creating Alipay web payment for order ${body.order_id}`);
      
      // Validate order exists
      const order = await this.prisma.order.findUnique({
        where: { id: body.order_id },
      });
      
      if (!order) {
        return { success: false, message: '订单不存在' };
      }
      
      // Check if payment already exists
      const existingPayment = await this.prisma.payment.findFirst({
        where: {
          orderId: body.order_id,
          provider: 'alipay',
          status: { in: ['pending', 'paid', 'succeeded'] },
        },
      });
      
      if (existingPayment?.status === 'paid' || existingPayment?.status === 'succeeded') {
        return { success: false, message: '订单已支付' };
      }
      
      // Create or update payment record
      const payment = await this.prisma.payment.upsert({
        where: {
          id: existingPayment?.id || 'new',
        },
        create: {
          orderId: body.order_id,
          provider: 'alipay',
          amount: body.amount,
          currency: 'CNY',
          status: 'pending',
          outTradeNo: `ALI_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          subject: body.subject || `Order ${order.orderNumber}`,
        },
        update: {
          amount: body.amount,
          status: 'pending',
          updatedAt: new Date(),
        },
      });
      
      // Set URLs (use environment variables if not provided)
      const returnUrl = body.return_url || process.env.ALIPAY_RETURN_URL || 'https://order.omnilaze.co/payment/success';
      const notifyUrl = body.notify_url || process.env.ALIPAY_NOTIFY_URL || 'https://backend.omnilaze.co/v1/alipay/gateway/notify';
      
      // Generate Alipay payment URL using SDK
      const paymentMethod = body.payment_method || 'wap'; // Default to mobile H5
      let paymentUrl: string;
      
      if (paymentMethod === 'page') {
        // PC网页支付
        paymentUrl = await this.alipayProvider.pagePay({
          outTradeNo: payment.outTradeNo,
          amount: payment.amount,
          subject: payment.subject || 'OmniLaze Order',
          returnUrl,
          notifyUrl,
        });
      } else {
        // 手机网站支付
        paymentUrl = await this.alipayProvider.wapPay({
          outTradeNo: payment.outTradeNo,
          amount: payment.amount,
          subject: payment.subject || 'OmniLaze Order',
          returnUrl,
          notifyUrl,
        });
      }
      
      // Log payment event
      await this.prisma.paymentEvent.create({
        data: {
          paymentId: payment.id,
          eventType: 'gateway_request',
          payload: {
            method: paymentMethod,
            returnUrl,
            notifyUrl,
          },
        },
      });
      
      return {
        success: true,
        message: '支付链接生成成功',
        data: {
          payment_id: payment.id,
          payment_url: paymentUrl,
          out_trade_no: payment.outTradeNo,
          provider: 'alipay',
          method: paymentMethod
        }
      };
      
    } catch (error: any) {
      this.logger.error('Failed to create Alipay web payment:', error);
      return {
        success: false,
        message: error.message || '支付初始化失败'
      };
    }
  }
  
  /**
   * Alipay asynchronous notification endpoint
   * Called by Alipay servers to notify payment status
   */
  @Post('/notify')
  async handleNotification(@Req() req: Request, @Res() res: Response) {
    try {
      this.logger.log('Received Alipay notification');
      
      // Verify webhook signature
      const verifyResult = await this.alipayProvider.verifyWebhook(req);
      
      if (!verifyResult.ok) {
        this.logger.error('Invalid Alipay notification signature');
        return res.status(400).send('fail');
      }
      
      const params = verifyResult.data;
      
      // Update payment status
      const payment = await this.prisma.payment.findFirst({
        where: { outTradeNo: params.out_trade_no },
      });
      
      if (!payment) {
        this.logger.error(`Payment not found for trade no: ${params.out_trade_no}`);
        return res.status(404).send('fail');
      }
      
      // Process based on trade status
      if (params.trade_status === 'TRADE_SUCCESS' || params.trade_status === 'TRADE_FINISHED') {
        // Update payment status
        const paidTime = params.gmt_payment || params.send_pay_date || params.notify_time
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'paid',
            transactionId: params.trade_no,
            paidAt: paidTime ? new Date(paidTime) : new Date(),
            updatedAt: new Date(),
          },
        });
        
        // Update order status
        await this.prisma.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: 'paid',
            paidAt: paidTime ? new Date(paidTime) : new Date(),
            updatedAt: new Date(),
          },
        });
        
        // Log payment event
        await this.prisma.paymentEvent.create({
          data: {
            paymentId: payment.id,
            eventType: 'payment_success',
            payload: params,
          },
        });
        
        this.logger.log(`Payment ${payment.id} marked as paid via gateway notification`);
      }
      
      // Alipay expects 'success' response
      return res.status(200).send('success');
      
    } catch (error: any) {
      this.logger.error('Failed to process Alipay notification:', error);
      return res.status(500).send('fail');
    }
  }
  
  /**
   * Alipay synchronous return endpoint
   * User is redirected here after payment
   */
  @Get('/return')
  async handleReturn(@Query() query: any, @Res() res: Response) {
    try {
      this.logger.log('User returned from Alipay payment');
      
      // Note: Return URL parameters should not be trusted for payment verification
      // Always verify payment status via server-side query or notification
      
      const outTradeNo = query.out_trade_no;
      const tradeNo = query.trade_no;
      
      if (!outTradeNo) {
        throw new Error('Missing trade number');
      }
      
      // Query actual payment status from database
      const payment = await this.prisma.payment.findFirst({
        where: { outTradeNo },
      });
      
      const order = payment ? await this.prisma.order.findUnique({
        where: { id: payment.orderId },
      }) : null;
      
      if (!payment) {
        throw new Error('Payment not found');
      }
      
      // Generate return page based on payment status
      let returnHtml: string;
      
      if (payment.status === 'paid') {
        returnHtml = this.generateSuccessPage({
          orderNumber: order?.orderNumber || 'Unknown',
          amount: payment.amount,
          transactionId: tradeNo || payment.transactionId,
        });
      } else {
        // Payment might still be processing
        returnHtml = this.generateProcessingPage({
          orderNumber: order?.orderNumber || 'Unknown',
          outTradeNo,
        });
      }
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(returnHtml);
      
    } catch (error: any) {
      this.logger.error('Failed to handle Alipay return:', error);
      
      const errorHtml = this.generateErrorPage(error.message || '支付结果查询失败');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(500).send(errorHtml);
    }
  }
  
  /**
   * Query payment status endpoint
   * Used to check payment status from frontend
   */
  @Get('/status')
  async queryPaymentStatus(@Query('out_trade_no') outTradeNo: string) {
    try {
      if (!outTradeNo) {
        throw new HttpException('Missing trade number', HttpStatus.BAD_REQUEST);
      }
      
      const payment = await this.prisma.payment.findFirst({
        where: { outTradeNo },
      });
      
      if (!payment) {
        throw new HttpException('Payment not found', HttpStatus.NOT_FOUND);
      }
      
      const order = await this.prisma.order.findUnique({
        where: { id: payment.orderId },
      });
      
      return {
        success: true,
        data: {
          status: payment.status,
          amount: payment.amount,
          orderNumber: order?.orderNumber || 'Unknown',
          transactionId: payment.transactionId,
          paidAt: payment.paidAt,
        },
      };
      
    } catch (error: any) {
      this.logger.error('Failed to query payment status:', error);
      throw error;
    }
  }
  
  /**
   * Generate payment form HTML that auto-submits to Alipay
   */
  private generatePaymentForm(params: {
    outTradeNo: string;
    amount: number;
    subject: string;
    returnUrl: string;
    notifyUrl: string;
    paymentMethod: 'page' | 'wap';
  }): string {
    // Note: In production, this should use the real Alipay SDK to generate the form
    // This is a simplified example
    
    const gateway = process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>正在跳转到支付宝...</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .loading-container {
            text-align: center;
            padding: 40px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        h2 {
            color: #333;
            margin-bottom: 10px;
        }
        p {
            color: #666;
            margin: 5px 0;
        }
        .amount {
            font-size: 24px;
            color: #667eea;
            font-weight: bold;
            margin: 15px 0;
        }
        .manual-button {
            display: inline-block;
            margin-top: 20px;
            padding: 12px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            transition: background 0.3s;
        }
        .manual-button:hover {
            background: #5a67d8;
        }
    </style>
</head>
<body>
    <div class="loading-container">
        <div class="spinner"></div>
        <h2>正在跳转到支付宝</h2>
        <p>订单号: ${params.outTradeNo}</p>
        <div class="amount">¥${params.amount.toFixed(2)}</div>
        <p>请稍候...</p>
        <a href="#" class="manual-button" onclick="document.getElementById('alipayForm').submit(); return false;">
            手动跳转
        </a>
    </div>
    
    <!-- Auto-submit form to Alipay -->
    <form id="alipayForm" action="${gateway}" method="post" style="display: none;">
        <!-- These parameters should be generated by Alipay SDK with proper signature -->
        <input name="out_trade_no" value="${params.outTradeNo}" />
        <input name="total_amount" value="${params.amount}" />
        <input name="subject" value="${params.subject}" />
        <input name="return_url" value="${params.returnUrl}" />
        <input name="notify_url" value="${params.notifyUrl}" />
        <!-- Additional parameters would be added by real SDK -->
    </form>
    
    <script>
        // Auto-submit form after page loads
        setTimeout(function() {
            document.getElementById('alipayForm').submit();
        }, 1000);
    </script>
</body>
</html>
    `;
  }
  
  /**
   * Generate success page HTML
   */
  private generateSuccessPage(params: {
    orderNumber: string;
    amount: number;
    transactionId?: string;
  }): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>支付成功</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .success-container {
            text-align: center;
            padding: 40px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            max-width: 400px;
        }
        .checkmark {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: block;
            stroke-width: 2;
            stroke: #4bb543;
            stroke-miterlimit: 10;
            margin: 0 auto 20px;
            box-shadow: inset 0px 0px 0px #4bb543;
            animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both;
        }
        .checkmark__circle {
            stroke-dasharray: 166;
            stroke-dashoffset: 166;
            stroke-width: 2;
            stroke-miterlimit: 10;
            stroke: #4bb543;
            fill: none;
            animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
        }
        .checkmark__check {
            transform-origin: 50% 50%;
            stroke-dasharray: 48;
            stroke-dashoffset: 48;
            animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
        }
        @keyframes stroke {
            100% { stroke-dashoffset: 0; }
        }
        @keyframes scale {
            0%, 100% { transform: none; }
            50% { transform: scale3d(1.1, 1.1, 1); }
        }
        @keyframes fill {
            100% { box-shadow: inset 0px 0px 0px 30px #4bb543; }
        }
        h2 {
            color: #333;
            margin-bottom: 10px;
        }
        p {
            color: #666;
            margin: 10px 0;
        }
        .amount {
            font-size: 28px;
            color: #4bb543;
            font-weight: bold;
            margin: 20px 0;
        }
        .return-button {
            display: inline-block;
            margin-top: 20px;
            padding: 12px 40px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            transition: background 0.3s;
        }
        .return-button:hover {
            background: #5a67d8;
        }
    </style>
</head>
<body>
    <div class="success-container">
        <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
            <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
            <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
        </svg>
        <h2>支付成功！</h2>
        <div class="amount">¥${params.amount.toFixed(2)}</div>
        <p>订单号: ${params.orderNumber}</p>
        ${params.transactionId ? `<p>交易号: ${params.transactionId}</p>` : ''}
        <a href="https://order.omnilaze.co" class="return-button">返回订单页面</a>
    </div>
</body>
</html>
    `;
  }
  
  /**
   * Generate processing page HTML
   */
  private generateProcessingPage(params: {
    orderNumber: string;
    outTradeNo: string;
  }): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>支付处理中</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .processing-container {
            text-align: center;
            padding: 40px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            max-width: 400px;
        }
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        h2 {
            color: #333;
            margin-bottom: 10px;
        }
        p {
            color: #666;
            margin: 10px 0;
        }
        .status-button {
            display: inline-block;
            margin-top: 20px;
            padding: 12px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            transition: background 0.3s;
        }
        .status-button:hover {
            background: #5a67d8;
        }
    </style>
</head>
<body>
    <div class="processing-container">
        <div class="spinner"></div>
        <h2>支付处理中...</h2>
        <p>订单号: ${params.orderNumber}</p>
        <p>支付结果正在确认，请稍候</p>
        <a href="/v1/alipay/gateway/status?out_trade_no=${params.outTradeNo}" class="status-button">
            查询支付状态
        </a>
    </div>
    
    <script>
        // Auto-refresh to check payment status
        setTimeout(function() {
            fetch('/v1/alipay/gateway/status?out_trade_no=${params.outTradeNo}')
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.data.status === 'paid') {
                        window.location.reload();
                    }
                })
                .catch(console.error);
        }, 3000);
    </script>
</body>
</html>
    `;
  }
  
  /**
   * Generate error page HTML
   */
  private generateErrorPage(message: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>支付失败</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .error-container {
            text-align: center;
            padding: 40px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            max-width: 400px;
        }
        .error-icon {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: #ff4444;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            animation: shake 0.5s;
        }
        .error-icon::before {
            content: '✕';
            color: white;
            font-size: 40px;
            font-weight: bold;
        }
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        h2 {
            color: #333;
            margin-bottom: 10px;
        }
        p {
            color: #666;
            margin: 10px 0;
        }
        .error-message {
            color: #ff4444;
            margin: 20px 0;
            padding: 10px;
            background: #ffeeee;
            border-radius: 4px;
        }
        .retry-button {
            display: inline-block;
            margin-top: 20px;
            padding: 12px 40px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            transition: background 0.3s;
        }
        .retry-button:hover {
            background: #5a67d8;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-icon"></div>
        <h2>支付失败</h2>
        <div class="error-message">${message}</div>
        <p>请返回重新尝试支付</p>
        <a href="https://order.omnilaze.co" class="retry-button">返回订单页面</a>
    </div>
</body>
</html>
    `;
  }
}
