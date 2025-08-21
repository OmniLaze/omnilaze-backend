import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '../../../config/config.service';

interface WechatPayConfig {
  mchId: string;          // 商户号
  appId: string;          // 应用ID
  apiKeyV3: string;       // API密钥v3
  serialNo: string;       // 商户证书序列号
  privateKey: string;     // 商户私钥
  notifyUrl: string;      // 支付回调URL
  gateway?: string;       // API网关地址
}

interface H5PaymentRequest {
  outTradeNo: string;     // 商户订单号
  amount: number;         // 金额（分）
  description: string;    // 商品描述
  notifyUrl?: string;     // 回调地址
  timeExpire?: string;    // 订单失效时间
}

interface H5PaymentResponse {
  h5_url: string;         // H5支付跳转链接
}

interface JSAPIPaymentRequest {
  outTradeNo: string;     // 商户订单号
  amount: number;         // 金额（分）
  description: string;    // 商品描述
  openid: string;         // 用户openid
  notifyUrl?: string;     // 回调地址
}

interface JSAPIPaymentResponse {
  prepay_id: string;      // 预支付交易会话标识
}

interface RefundRequest {
  outTradeNo: string;     // 商户订单号
  outRefundNo: string;    // 商户退款单号
  amount: number;         // 退款金额（分）
  refundAmount: number;   // 原订单金额（分）
  reason?: string;        // 退款原因
}

@Injectable()
export class WechatPayProvider {
  private readonly logger = new Logger(WechatPayProvider.name);
  private config: WechatPayConfig;
  private httpClient: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.initializeConfig();
    this.initializeHttpClient();
  }

  private initializeConfig() {
    this.config = {
      mchId: process.env.WECHAT_MCH_ID || '',
      appId: process.env.WECHAT_APP_ID || '',
      apiKeyV3: process.env.WECHAT_API_KEY_V3 || '',
      serialNo: process.env.WECHAT_SERIAL_NO || '',
      privateKey: process.env.WECHAT_PRIVATE_KEY || '',
      notifyUrl: process.env.WECHAT_NOTIFY_URL || '',
      gateway: process.env.WECHAT_GATEWAY || 'https://api.mch.weixin.qq.com',
    };

    // 验证必要配置
    const requiredFields = ['mchId', 'appId', 'apiKeyV3', 'serialNo', 'privateKey'];
    for (const field of requiredFields) {
      if (!this.config[field as keyof WechatPayConfig]) {
        this.logger.warn(`WeChat Pay config missing: ${field}`);
      }
    }
  }

  private initializeHttpClient() {
    this.httpClient = axios.create({
      baseURL: this.config.gateway,
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器 - 添加签名
    this.httpClient.interceptors.request.use(
      (config) => {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const nonce = this.generateNonce();
        const signature = this.generateSignature(
          config.method?.toUpperCase() || 'GET',
          config.url || '',
          timestamp,
          nonce,
          JSON.stringify(config.data || '')
        );

        config.headers['Authorization'] = this.buildAuthHeader(signature, timestamp, nonce);
        config.headers['Wechatpay-Serial'] = this.config.serialNo;
        
        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * 生成签名
   */
  private generateSignature(
    method: string,
    url: string,
    timestamp: string,
    nonce: string,
    body: string
  ): string {
    const message = `${method}\n${url}\n${timestamp}\n${nonce}\n${body}\n`;
    
    try {
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(message);
      sign.end();
      
      // 处理私钥格式
      let privateKey = this.config.privateKey;
      if (!privateKey.includes('BEGIN')) {
        privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
      }
      
      return sign.sign(privateKey, 'base64');
    } catch (error) {
      this.logger.error('Signature generation failed:', error);
      throw new Error('Failed to generate signature');
    }
  }

  /**
   * 构建认证头
   */
  private buildAuthHeader(signature: string, timestamp: string, nonce: string): string {
    return `WECHATPAY2-SHA256-RSA2048 mchid="${this.config.mchId}",serial_no="${this.config.serialNo}",nonce_str="${nonce}",timestamp="${timestamp}",signature="${signature}"`;
  }

  /**
   * 生成随机字符串
   */
  private generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * 创建H5支付订单
   */
  async createH5Payment(request: H5PaymentRequest): Promise<H5PaymentResponse> {
    try {
      const data = {
        appid: this.config.appId,
        mchid: this.config.mchId,
        description: request.description,
        out_trade_no: request.outTradeNo,
        time_expire: request.timeExpire || this.getExpireTime(5), // 默认5分钟过期
        notify_url: request.notifyUrl || this.config.notifyUrl,
        amount: {
          total: request.amount,
          currency: 'CNY',
        },
        scene_info: {
          payer_client_ip: '127.0.0.1', // 实际应用中应获取真实IP
          h5_info: {
            type: 'Wap',
          },
        },
      };

      const response = await this.httpClient.post('/v3/pay/transactions/h5', data);
      
      if (response.data && response.data.h5_url) {
        this.logger.log(`H5 payment created: ${request.outTradeNo}`);
        return { h5_url: response.data.h5_url };
      }
      
      throw new Error('Invalid response from WeChat Pay');
    } catch (error: any) {
      this.logger.error('H5 payment creation failed:', error.response?.data || error.message);
      throw new Error(`Failed to create H5 payment: ${error.message}`);
    }
  }

  /**
   * 创建JSAPI支付订单
   */
  async createJSAPIPayment(request: JSAPIPaymentRequest): Promise<JSAPIPaymentResponse> {
    try {
      const data = {
        appid: this.config.appId,
        mchid: this.config.mchId,
        description: request.description,
        out_trade_no: request.outTradeNo,
        notify_url: request.notifyUrl || this.config.notifyUrl,
        amount: {
          total: request.amount,
          currency: 'CNY',
        },
        payer: {
          openid: request.openid,
        },
      };

      const response = await this.httpClient.post('/v3/pay/transactions/jsapi', data);
      
      if (response.data && response.data.prepay_id) {
        this.logger.log(`JSAPI payment created: ${request.outTradeNo}`);
        return { prepay_id: response.data.prepay_id };
      }
      
      throw new Error('Invalid response from WeChat Pay');
    } catch (error: any) {
      this.logger.error('JSAPI payment creation failed:', error.response?.data || error.message);
      throw new Error(`Failed to create JSAPI payment: ${error.message}`);
    }
  }

  /**
   * 查询订单状态
   */
  async queryOrder(outTradeNo: string): Promise<any> {
    try {
      const url = `/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${this.config.mchId}`;
      const response = await this.httpClient.get(url);
      
      this.logger.log(`Order query result for ${outTradeNo}: ${response.data.trade_state}`);
      return response.data;
    } catch (error: any) {
      this.logger.error('Order query failed:', error.response?.data || error.message);
      throw new Error(`Failed to query order: ${error.message}`);
    }
  }

  /**
   * 申请退款
   */
  async refundOrder(request: RefundRequest): Promise<any> {
    try {
      const data = {
        out_trade_no: request.outTradeNo,
        out_refund_no: request.outRefundNo,
        reason: request.reason || '用户申请退款',
        notify_url: this.config.notifyUrl,
        amount: {
          refund: request.refundAmount,
          total: request.amount,
          currency: 'CNY',
        },
      };

      const response = await this.httpClient.post('/v3/refund/domestic/refunds', data);
      
      this.logger.log(`Refund initiated for order ${request.outTradeNo}`);
      return response.data;
    } catch (error: any) {
      this.logger.error('Refund failed:', error.response?.data || error.message);
      throw new Error(`Failed to refund order: ${error.message}`);
    }
  }

  /**
   * 验证支付通知签名
   */
  async verifyNotification(headers: any, body: any): Promise<{ ok: boolean; data: any }> {
    try {
      // 获取必要的头部信息
      const signature = headers['wechatpay-signature'];
      const timestamp = headers['wechatpay-timestamp'];
      const nonce = headers['wechatpay-nonce'];
      const serial = headers['wechatpay-serial'];

      if (!signature || !timestamp || !nonce || !serial) {
        this.logger.error('Missing required headers for notification verification');
        return { ok: false, data: null };
      }

      // 构建验签字符串
      const message = `${timestamp}\n${nonce}\n${JSON.stringify(body)}\n`;
      
      // TODO: 实际应用中需要从微信获取平台证书进行验签
      // 这里简化处理，实际生产环境必须实现完整的验签逻辑
      if (process.env.NODE_ENV === 'development') {
        this.logger.warn('Development mode: Skipping signature verification');
        
        // 解密通知数据（如果加密）
        const notificationData = body.resource ? await this.decryptNotification(body.resource) : body;
        
        return { ok: true, data: notificationData };
      }

      // 生产环境必须验证签名
      const isValid = await this.verifySignature(message, signature, serial);
      if (!isValid) {
        this.logger.error('Notification signature verification failed');
        return { ok: false, data: null };
      }

      // 解密通知数据
      const notificationData = body.resource ? await this.decryptNotification(body.resource) : body;
      
      return { ok: true, data: notificationData };
    } catch (error: any) {
      this.logger.error('Notification verification failed:', error);
      return { ok: false, data: null };
    }
  }

  /**
   * 验证签名（需要平台证书）
   */
  private async verifySignature(message: string, signature: string, serial: string): Promise<boolean> {
    // TODO: 实现完整的签名验证逻辑
    // 1. 获取/缓存微信平台证书
    // 2. 使用证书公钥验证签名
    this.logger.warn('Signature verification not fully implemented');
    return false;
  }

  /**
   * 解密通知数据
   */
  private async decryptNotification(resource: any): Promise<any> {
    try {
      // 使用AES-256-GCM解密
      const ciphertext = resource.ciphertext;
      const associatedData = resource.associated_data;
      const nonce = resource.nonce;
      
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        Buffer.from(this.config.apiKeyV3),
        Buffer.from(nonce)
      );
      
      decipher.setAuthTag(Buffer.from(ciphertext.slice(-16), 'base64'));
      decipher.setAAD(Buffer.from(associatedData));
      
      let decrypted = decipher.update(
        Buffer.from(ciphertext.slice(0, -16), 'base64'),
        undefined,
        'utf8'
      );
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      this.logger.error('Failed to decrypt notification:', error);
      throw error;
    }
  }

  /**
   * 获取过期时间（ISO 8601格式）
   */
  private getExpireTime(minutes: number): string {
    const expireTime = new Date(Date.now() + minutes * 60 * 1000);
    return expireTime.toISOString().replace(/\.\d{3}Z$/, '+08:00');
  }

  /**
   * 生成JSAPI支付参数（供前端调用）
   */
  generateJSAPIPayParams(prepayId: string): any {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = this.generateNonce();
    const packageStr = `prepay_id=${prepayId}`;
    
    // 签名
    const signMessage = `${this.config.appId}\n${timestamp}\n${nonce}\n${packageStr}\n`;
    const paySign = this.generateSignature('', '', '', '', signMessage);
    
    return {
      appId: this.config.appId,
      timeStamp: timestamp,
      nonceStr: nonce,
      package: packageStr,
      signType: 'RSA',
      paySign,
    };
  }
}