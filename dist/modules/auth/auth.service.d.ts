import { PrismaService } from '../../db/prisma.service';
export declare class AuthService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    /**
     * 创建传统阿里云短信客户端
     */
    private createSmsClient;
    /**
     * 尝试通过SPUG_URL发送验证码
     */
    private sendViaSPUG;
    /**
     * 尝试通过阿里云发送验证码（备用方案）
     */
    private sendViaAliyun;
    sendVerificationCode(phoneNumber: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: any;
    }>;
    loginWithPhone(phoneNumber: string, verificationCode: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: {
            user_id: any;
            phone_number: string;
            is_new_user: boolean;
            user_sequence?: undefined;
        };
    } | {
        success: boolean;
        message: string;
        data: {
            user_id: string;
            phone_number: string;
            is_new_user: boolean;
            user_sequence: number;
        };
    }>;
    verifyInviteAndCreate(phoneNumber: string, inviteCode: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: {
            user_id: string;
            phone_number: string;
            user_sequence: number;
            user_invite_code: string;
        };
    }>;
}
