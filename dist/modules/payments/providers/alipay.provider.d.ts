export declare class AlipayProvider {
    private readonly logger;
    private sdk;
    private ensureSdk;
    /**
     * 创建H5支付（手机网站支付）
     */
    createH5Payment(params: {
        outTradeNo: string;
        amount: number;
        subject: string;
        notifyUrl?: string;
        returnUrl?: string;
    }): Promise<{
        h5_url: string;
    }>;
    /**
     * 创建扫码支付
     */
    precreate(payment: any, order: any): Promise<{
        qr_code: any;
    }>;
    /**
     * 验证支付通知签名
     */
    verifyWebhook(req: any): Promise<{
        ok: boolean;
        data: any;
    }>;
    /**
     * PC网页支付
     */
    pagePay(params: {
        outTradeNo: string;
        amount: number;
        subject: string;
        returnUrl: string;
        notifyUrl: string;
    }): Promise<string>;
    /**
     * 手机网站支付
     */
    wapPay(params: {
        outTradeNo: string;
        amount: number;
        subject: string;
        returnUrl: string;
        notifyUrl: string;
    }): Promise<string>;
    /**
     * 查询订单状态
     */
    query(outTradeNo: string): Promise<any>;
    /**
     * 申请退款
     */
    refund(params: {
        outTradeNo: string;
        refundAmount: number;
        refundReason?: string;
        outRequestNo?: string;
    }): Promise<any>;
    /**
     * 验证webhook数据完整性
     */
    private validateWebhookData;
    /**
     * 关闭订单
     */
    close(outTradeNo: string): Promise<any>;
    /**
     * 查询退款状态
     */
    queryRefund(params: {
        outTradeNo: string;
        outRequestNo: string;
    }): Promise<any>;
}
