import { Injectable } from '@nestjs/common';

@Injectable()
export class AlipayProvider {
  private sdk: any = null;

  private ensureSdk() {
    if (this.sdk) return this.sdk;
    const appId = process.env.ALIPAY_APP_ID;
    const privateKey = process.env.ALIPAY_PRIVATE_KEY;
    const alipayPublicKey = process.env.ALIPAY_PUBLIC_KEY;
    const gateway = process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do';
    
    if (!appId || !privateKey || !alipayPublicKey) {
      throw new Error('Alipay credentials are not set');
    }

    // For now, we'll create a mock SDK until proper alipay-sdk is configured
    this.sdk = {
      exec: async (method: string, params: any) => {
        console.log(`Mock Alipay SDK - Method: ${method}`, params);
        return { qr_code: 'mock_qr_code_url' };
      },
      checkNotifySign: async (params: any) => {
        console.log('Mock Alipay SDK - Verify notification', params);
        return true;
      }
    };
    
    return this.sdk;
  }

  async precreate(payment: any, order: any) {
    const sdk = this.ensureSdk();
    const result = await sdk.exec('alipay.trade.precreate', {
      notify_url: process.env.ALIPAY_NOTIFY_URL,
      bizContent: {
        out_trade_no: payment.outTradeNo,
        total_amount: payment.amount.toFixed(2),
        subject: payment.subject || `Order ${order.orderNumber}`,
      },
    });
    return { qr_code: result.qr_code };
  }

  async verifyWebhook(req: any): Promise<{ ok: boolean; data: any }> {
    const sdk = this.ensureSdk();
    const params = req.body || {};
    
    try {
      const signOk = await sdk.checkNotifySign(params);
      if (!signOk) return { ok: false, data: null };
      return { ok: true, data: params };
    } catch (error) {
      console.error('Alipay webhook verification failed:', error);
      return { ok: false, data: null };
    }
  }
}


