import { PrismaService } from '../../db/prisma.service';
export declare class AuthService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    /**
     * 创建传统阿里云短信客户端
     */
    private createSmsClient;
    sendVerificationCode(phoneNumber: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: {
            dev_code: string;
            sent: boolean;
            bizId?: undefined;
            requestId?: undefined;
        };
    } | {
        success: boolean;
        message: string;
        data: {
            sent: boolean;
            bizId: string;
            requestId: string;
            dev_code?: undefined;
        };
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
