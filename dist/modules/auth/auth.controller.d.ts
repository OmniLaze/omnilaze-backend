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
        data: any;
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
