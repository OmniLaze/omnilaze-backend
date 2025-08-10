export declare class HealthController {
    get(): {
        success: boolean;
        code: string;
        message: string;
        data: {
            env: string;
            timestamp: string;
        };
    };
}
