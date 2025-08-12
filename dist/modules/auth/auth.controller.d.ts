import { AuthService } from './auth.service';
import { ConfigService } from '../../config/config.service';
export declare class AuthController {
    private readonly authService;
    private readonly config;
    constructor(authService: AuthService, config: ConfigService);
    sendCode(body: {
        phone_number: string;
    }): Promise<{
        success: boolean;
        code: string;
        message: string;
        data: {
            dev_code: string;
            sent: boolean;
            bizId?: undefined;
            requestId?: undefined;
        } | {
            sent: boolean;
            dev_code: string | undefined;
            bizId: string | undefined;
            requestId: any;
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
