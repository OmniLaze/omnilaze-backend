import { AuthService } from './auth.service';
import { ConfigService } from '../../config/config.service';
import { SendVerificationCodeDto, LoginWithPhoneDto, VerifyInviteCodeDto } from './dto/auth.dto';
export declare class AuthController {
    private readonly authService;
    private readonly config;
    constructor(authService: AuthService, config: ConfigService);
    sendCode(body: SendVerificationCodeDto): Promise<{
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
            bizId: string;
            requestId: string;
            dev_code?: undefined;
        };
    }>;
    login(body: LoginWithPhoneDto): Promise<{
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
    verifyInvite(body: VerifyInviteCodeDto): Promise<{
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
