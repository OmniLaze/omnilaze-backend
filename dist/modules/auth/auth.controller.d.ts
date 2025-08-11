import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    sendCode(body: {
        phone_number: string;
    }): Promise<{
        success: boolean;
        code: string;
        message: string;
        data: {
            sent: boolean;
            dev_code?: undefined;
        } | {
            dev_code: string;
            sent: boolean;
        } | undefined;
    }>;
    login(body: {
        phone_number: string;
        verification_code: string;
    }): Promise<{
        success: boolean;
        code: string;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        code: string;
        message: string;
        data: any;
    }>;
    getAliyunAuthToken(): Promise<{
        success: boolean;
        code: string;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        code: string;
        message: string;
        data: {
            authToken: any;
            requestId: string | undefined;
        } | undefined;
    }>;
    loginWithAliyun(body: {
        sp_token: string;
    }): Promise<{
        success: boolean;
        code: string;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        code: string;
        message: string;
        data: any;
    }>;
    verifyInvite(body: {
        phone_number: string;
        invite_code: string;
    }): Promise<{
        success: boolean;
        code: string;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        code: string;
        message: string;
        data: any;
    }>;
}
