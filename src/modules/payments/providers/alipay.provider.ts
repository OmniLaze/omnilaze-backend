import { Injectable, Logger } from '@nestjs/common';
import { AlipaySdk } from 'alipay-sdk';

@Injectable()
export class AlipayProvider {
  private readonly logger = new Logger(AlipayProvider.name);
  private sdk: AlipaySdk | null = null;

  private ensureSdk(): AlipaySdk {
    if (this.sdk) return this.sdk;
    
    const appId = process.env.ALIPAY_APP_ID;
    const privateKey = process.env.ALIPAY_PRIVATE_KEY;
    const alipayPublicKey = process.env.ALIPAY_PUBLIC_KEY;
    const gateway = process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do';
    
    // Enhanced credential validation with detailed logging
    const missingCredentials = [];
    if (!appId) missingCredentials.push('ALIPAY_APP_ID');
    if (!privateKey) missingCredentials.push('ALIPAY_PRIVATE_KEY');
    if (!alipayPublicKey) missingCredentials.push('ALIPAY_PUBLIC_KEY');
    
    if (missingCredentials.length > 0) {
      this.logger.error(`Alipay credentials missing: ${missingCredentials.join(', ')}`);
      this.logger.error('Please check environment variables or SSM Parameter Store configuration');
      throw new Error(`Alipay credentials are not configured: missing ${missingCredentials.join(', ')}`);
    }

    try {
      // 初始化支付宝SDK
      this.sdk = new AlipaySdk({
        appId,
        privateKey,
        alipayPublicKey,
        gateway,
        timeout: 5000,
        camelcase: false,
        charset: 'utf-8',
        version: '1.0',
        signType: 'RSA2',
        keyType: 'PKCS8', // 默认PKCS8格式私钥
      });
      
      this.logger.log(`Alipay SDK initialized successfully with App ID: ${appId.substring(0, 6)}***`);
      return this.sdk;
    } catch (error) {
      this.logger.error('Failed to initialize Alipay SDK:', error);
      throw new Error(`Alipay SDK initialization failed: ${error.message}`);
    }
  }

  /**
   * 创建H5支付（手机网站支付）
   */
    async createH5Payment(params: {
      outTradeNo: string;
      amount: number;
      subject: string;
      notifyUrl?: string;
      returnUrl?: string;
    }): Promise<{ h5_url: string }> {
      try {
        const sdk = this.ensureSdk();
        const url = sdk.pageExec('alipay.trade.wap.pay', 'GET', {
          bizContent: {
            outTradeNo: params.outTradeNo,
            totalAmount: params.amount.toFixed(2),
            subject: params.subject,
            productCode: 'QUICK_WAP_WAY',
            quitUrl: params.returnUrl,
          },
          returnUrl: params.returnUrl,
          notifyUrl: params.notifyUrl,
        });
        if (typeof url === 'string' && url.startsWith('http')) {
          this.logger.log(`H5 payment URL created for order ${params.outTradeNo}`);
          return { h5_url: url };
        }
        throw new Error('Failed to generate payment URL');
      } catch (error: any) {
        this.logger.error('Failed to create H5 payment:', error);
        throw new Error(`Failed to create H5 payment: ${error.message}`);
      }
    }

  /**
   * 创建扫码支付
   */
  async precreate(payment: any, order: any) {
    try {
      const sdk = this.ensureSdk();
      
      const result = await sdk.exec('alipay.trade.precreate', {
        notify_url: process.env.ALIPAY_NOTIFY_URL,
        bizContent: {
          out_trade_no: payment.outTradeNo,
          total_amount: payment.amount.toFixed(2),
          subject: payment.subject || `Order ${order.orderNumber}`,
        },
      });
      
      if (result && result.qr_code) {
        return { qr_code: result.qr_code };
      }
      
      throw new Error('Failed to create QR code');
    } catch (error: any) {
      this.logger.error('Failed to create precreate payment:', error);
      throw error;
    }
  }

  /**
   * 验证支付通知签名
   */
  async verifyWebhook(req: any): Promise<{ ok: boolean; data: any }> {
    try {
      const sdk = this.ensureSdk();
      const params = req.body || {};
      
      // 使用SDK验证签名
      const signOk = sdk.checkNotifySign(params);
      
      if (!signOk) {
        this.logger.error('Alipay webhook signature verification failed');
        return { ok: false, data: null };
      }
      
      // 额外的数据验证
      if (!this.validateWebhookData(params)) {
        this.logger.error('Alipay webhook data validation failed');
        return { ok: false, data: null };
      }
      
      return { ok: true, data: params };
    } catch (error: any) {
      this.logger.error('Alipay webhook verification failed:', error);
      return { ok: false, data: null };
    }
  }
  
  /**
   * PC网页支付
   */
    async pagePay(params: {
      outTradeNo: string;
      amount: number;
      subject: string;
      returnUrl: string;
      notifyUrl: string;
    }): Promise<string> {
      try {
        const sdk = this.ensureSdk();
        const url = sdk.pageExec('alipay.trade.page.pay', 'GET', {
          bizContent: {
            outTradeNo: params.outTradeNo,
            totalAmount: params.amount.toFixed(2),
            subject: params.subject,
            productCode: 'FAST_INSTANT_TRADE_PAY',
          },
          returnUrl: params.returnUrl,
          notifyUrl: params.notifyUrl,
        });
        if (typeof url === 'string' && url.startsWith('http')) return url;
        throw new Error('Failed to generate page pay URL');
      } catch (error: any) {
        this.logger.error('Failed to create page payment:', error);
        throw error;
      }
    }
  
  /**
   * 手机网站支付
   */
    async wapPay(params: {
      outTradeNo: string;
      amount: number;
      subject: string;
      returnUrl: string;
      notifyUrl: string;
    }): Promise<string> {
      try {
        const sdk = this.ensureSdk();
        const url = sdk.pageExec('alipay.trade.wap.pay', 'GET', {
          bizContent: {
            outTradeNo: params.outTradeNo,
            totalAmount: params.amount.toFixed(2),
            subject: params.subject,
            productCode: 'QUICK_WAP_WAY',
          },
          returnUrl: params.returnUrl,
          notifyUrl: params.notifyUrl,
        });
        if (typeof url === 'string' && url.startsWith('http')) return url;
        throw new Error('Failed to generate wap pay URL');
      } catch (error: any) {
        this.logger.error('Failed to create wap payment:', error);
        throw error;
      }
    }
  
  /**
   * 查询订单状态
   */
  async query(outTradeNo: string): Promise<any> {
    try {
      const sdk = this.ensureSdk();
      
      const result = await sdk.exec('alipay.trade.query', {
        bizContent: {
          out_trade_no: outTradeNo,
        },
      });
      
      return result;
    } catch (error: any) {
      this.logger.error('Failed to query order:', error);
      throw error;
    }
  }
  
  /**
   * 申请退款
   */
  async refund(params: {
    outTradeNo: string;
    refundAmount: number;
    refundReason?: string;
    outRequestNo?: string; // 退款请求号，部分退款必须提供
  }): Promise<any> {
    try {
      const sdk = this.ensureSdk();
      
      const bizContent: any = {
        out_trade_no: params.outTradeNo,
        refund_amount: params.refundAmount.toFixed(2),
      };
      
      // 退款原因
      if (params.refundReason) {
        bizContent.refund_reason = params.refundReason;
      }
      
      // 退款请求号（用于部分退款）
      if (params.outRequestNo) {
        bizContent.out_request_no = params.outRequestNo;
      }
      
      const result = await sdk.exec('alipay.trade.refund', {
        bizContent,
      });
      
      if (result && result.code === '10000') {
        this.logger.log(`Refund successful for order ${params.outTradeNo}`);
        return {
          success: true,
          trade_no: result.trade_no,
          out_trade_no: result.out_trade_no,
          refund_fee: result.refund_fee,
          gmt_refund_pay: result.gmt_refund_pay,
        };
      }
      // Surface detailed error info from Alipay
      const detail = [result?.sub_msg, result?.msg].filter(Boolean).join(' | ')
      const code = result?.sub_code || result?.code || 'UNKNOWN'
      throw new Error(`${detail || 'Refund failed'} [${code}]`);
    } catch (error: any) {
      this.logger.error('Failed to refund order:', error);
      throw new Error(`Failed to refund: ${error.message}`);
    }
  }
  
  /**
   * 验证webhook数据完整性
   */
  private validateWebhookData(params: any): boolean {
    // 基础数据验证
    const requiredFields = ['trade_no', 'out_trade_no', 'trade_status', 'total_amount'];
    for (const field of requiredFields) {
      if (!params[field]) {
        this.logger.error(`Missing required field: ${field}`);
        return false;
      }
    }
    
    // 验证金额是正数
    const amount = parseFloat(params.total_amount);
    if (isNaN(amount) || amount <= 0) {
      this.logger.error('Invalid payment amount');
      return false;
    }
    
    // 验证交易状态
    const validStatuses = ['WAIT_BUYER_PAY', 'TRADE_CLOSED', 'TRADE_SUCCESS', 'TRADE_FINISHED'];
    if (!validStatuses.includes(params.trade_status)) {
      this.logger.error(`Invalid trade status: ${params.trade_status}`);
      return false;
    }
    
    return true;
  }
  
  /**
   * 关闭订单
   */
  async close(outTradeNo: string): Promise<any> {
    try {
      const sdk = this.ensureSdk();
      
      const result = await sdk.exec('alipay.trade.close', {
        bizContent: {
          out_trade_no: outTradeNo,
        },
      });
      
      if (result && result.code === '10000') {
        return { success: true };
      }
      
      throw new Error(result?.msg || 'Failed to close order');
    } catch (error: any) {
      this.logger.error('Failed to close order:', error);
      throw error;
    }
  }
  
  /**
   * 查询退款状态
   */
  async queryRefund(params: {
    outTradeNo: string;
    outRequestNo: string;
  }): Promise<any> {
    try {
      const sdk = this.ensureSdk();
      
      const result = await sdk.exec('alipay.trade.fastpay.refund.query', {
        bizContent: {
          out_trade_no: params.outTradeNo,
          out_request_no: params.outRequestNo,
        },
      });
      
      return result;
    } catch (error: any) {
      this.logger.error('Failed to query refund:', error);
      throw error;
    }
  }
}
