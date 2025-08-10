"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlipayProvider = void 0;
const common_1 = require("@nestjs/common");
let AlipayProvider = class AlipayProvider {
    constructor() {
        this.sdk = null;
    }
    ensureSdk() {
        if (this.sdk)
            return this.sdk;
        const appId = process.env.ALIPAY_APP_ID;
        const privateKey = process.env.ALIPAY_PRIVATE_KEY;
        const alipayPublicKey = process.env.ALIPAY_PUBLIC_KEY;
        const gateway = process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do';
        if (!appId || !privateKey || !alipayPublicKey) {
            throw new Error('Alipay credentials are not set');
        }
        // For now, we'll create a mock SDK until proper alipay-sdk is configured
        this.sdk = {
            exec: async (method, params) => {
                console.log(`Mock Alipay SDK - Method: ${method}`, params);
                return { qr_code: 'mock_qr_code_url' };
            },
            checkNotifySign: async (params) => {
                console.log('Mock Alipay SDK - Verify notification', params);
                return true;
            }
        };
        return this.sdk;
    }
    async precreate(payment, order) {
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
    async verifyWebhook(req) {
        const sdk = this.ensureSdk();
        const params = req.body || {};
        try {
            const signOk = await sdk.checkNotifySign(params);
            if (!signOk)
                return { ok: false, data: null };
            return { ok: true, data: params };
        }
        catch (error) {
            console.error('Alipay webhook verification failed:', error);
            return { ok: false, data: null };
        }
    }
};
exports.AlipayProvider = AlipayProvider;
exports.AlipayProvider = AlipayProvider = __decorate([
    (0, common_1.Injectable)()
], AlipayProvider);
//# sourceMappingURL=alipay.provider.js.map