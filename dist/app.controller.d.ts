import { Response } from 'express';
export declare class AppController {
    getRoot(res: Response): void;
    getTest(): {
        success: boolean;
        message: string;
        timestamp: string;
        endpoints: {
            docs: string;
            health: string;
            auth: string;
            orders: string;
            payments: string;
        };
    };
}
