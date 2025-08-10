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
            dev_code: string;
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
