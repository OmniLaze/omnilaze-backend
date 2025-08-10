export declare class AlipayProvider {
    private sdk;
    private ensureSdk;
    precreate(payment: any, order: any): Promise<{
        qr_code: any;
    }>;
    verifyWebhook(req: any): Promise<{
        ok: boolean;
        data: any;
    }>;
}
