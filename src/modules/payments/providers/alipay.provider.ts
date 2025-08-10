import { Injectable } from '@nestjs/common';
import AlipaySdk from 'alipay-sdk';

@Injectable()
export class AlipayProvider {
  private sdk: AlipaySdk | null = null;

  private ensureSdk() {
    if (this.sdk) return this.sdk;
    const appId = process.env.ALIPAY_APP_ID;
    const privateKey = process.env.ALIPAY_PRIVATE_KEY;
    const alipayPublicKey = process.env.ALIPAY_PUBLIC_KEY;
    const gateway = process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do';
    if (!appId || !privateKey || !alipayPublicKey) throw new Error('Alipay credentials are not set');
    this.sdk = new AlipaySdk({ appId, privateKey, alipayPublicKey, gateway, timeout: 10000, signType: 'RSA2' });
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
    return { qr_code: result.qr_code } as any;
  }

  async verifyWebhook(req: any): Promise<{ ok: boolean; data: any }> {
    const sdk = this.ensureSdk();
    const params = req.body || {};
    const signOk = await sdk.checkNotifySign(params).catch(() => false);
    if (!signOk) return { ok: false, data: null };
    return { ok: true, data: params };
  }
}


