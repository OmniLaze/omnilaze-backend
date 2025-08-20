"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AlipayProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlipayProvider = void 0;
const common_1 = require("@nestjs/common");
const alipay_sdk_1 = require("alipay-sdk");
let AlipayProvider = AlipayProvider_1 = class AlipayProvider {
    constructor() {
        this.logger = new common_1.Logger(AlipayProvider_1.name);
        this.sdk = null;
    }
    ensureSdk() {
        if (this.sdk)
            return this.sdk;
        const appId = process.env.ALIPAY_APP_ID;
        const privateKey = process.env.ALIPAY_PRIVATE_KEY;
        const alipayPublicKey = process.env.ALIPAY_PUBLIC_KEY;
        const gateway = process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do';
        // Enhanced credential validation with detailed logging
        const missingCredentials = [];
        if (!appId)
            missingCredentials.push('ALIPAY_APP_ID');
        if (!privateKey)
            missingCredentials.push('ALIPAY_PRIVATE_KEY');
        if (!alipayPublicKey)
            missingCredentials.push('ALIPAY_PUBLIC_KEY');
        if (missingCredentials.length > 0) {
            this.logger.error(`Alipay credentials missing: ${missingCredentials.join(', ')}`);
            this.logger.error('Please check environment variables or SSM Parameter Store configuration');
            throw new Error(`Alipay credentials are not configured: missing ${missingCredentials.join(', ')}`);
        }
        try {
            // 初始化支付宝SDK
            this.sdk = new alipay_sdk_1.AlipaySdk({
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
        }
        catch (error) {
            this.logger.error('Failed to initialize Alipay SDK:', error);
            throw new Error(`Alipay SDK initialization failed: ${error.message}`);
        }
    }
    /**
     * 创建H5支付（手机网站支付）
     */
    async createH5Payment(params) {
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
        }
        catch (error) {
            this.logger.error('Failed to create H5 payment:', error);
            throw new Error(`Failed to create H5 payment: ${error.message}`);
        }
    }
    /**
     * 创建扫码支付
     */
    async precreate(payment, order) {
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
        }
        catch (error) {
            this.logger.error('Failed to create precreate payment:', error);
            throw error;
        }
    }
    /**
     * 验证支付通知签名
     */
    async verifyWebhook(req) {
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
        }
        catch (error) {
            this.logger.error('Alipay webhook verification failed:', error);
            return { ok: false, data: null };
        }
    }
    /**
     * PC网页支付
     */
    async pagePay(params) {
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
            if (typeof url === 'string' && url.startsWith('http'))
                return url;
            throw new Error('Failed to generate page pay URL');
        }
        catch (error) {
            this.logger.error('Failed to create page payment:', error);
            throw error;
        }
    }
    /**
     * 手机网站支付
     */
    async wapPay(params) {
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
            if (typeof url === 'string' && url.startsWith('http'))
                return url;
            throw new Error('Failed to generate wap pay URL');
        }
        catch (error) {
            this.logger.error('Failed to create wap payment:', error);
            throw error;
        }
    }
    /**
     * 查询订单状态
     */
    async query(outTradeNo) {
        try {
            const sdk = this.ensureSdk();
            const result = await sdk.exec('alipay.trade.query', {
                bizContent: {
                    out_trade_no: outTradeNo,
                },
            });
            return result;
        }
        catch (error) {
            this.logger.error('Failed to query order:', error);
            throw error;
        }
    }
    /**
     * 申请退款
     */
    async refund(params) {
        try {
            const sdk = this.ensureSdk();
            const bizContent = {
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
            throw new Error(result?.msg || 'Refund failed');
        }
        catch (error) {
            this.logger.error('Failed to refund order:', error);
            throw new Error(`Failed to refund: ${error.message}`);
        }
    }
    /**
     * 验证webhook数据完整性
     */
    validateWebhookData(params) {
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
    async close(outTradeNo) {
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
        }
        catch (error) {
            this.logger.error('Failed to close order:', error);
            throw error;
        }
    }
    /**
     * 查询退款状态
     */
    async queryRefund(params) {
        try {
            const sdk = this.ensureSdk();
            const result = await sdk.exec('alipay.trade.fastpay.refund.query', {
                bizContent: {
                    out_trade_no: params.outTradeNo,
                    out_request_no: params.outRequestNo,
                },
            });
            return result;
        }
        catch (error) {
            this.logger.error('Failed to query refund:', error);
            throw error;
        }
    }
};
exports.AlipayProvider = AlipayProvider;
exports.AlipayProvider = AlipayProvider = AlipayProvider_1 = __decorate([
    (0, common_1.Injectable)()
], AlipayProvider);
//# sourceMappingURL=alipay.provider.js.map