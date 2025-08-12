import { PrismaService } from '../../db/prisma.service';
export declare class AuthService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    /**
     * 创建阿里云Dypnsapi客户端
     */
    private createDypnsapiClient;
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
            dev_code: string | undefined;
            bizId: string | undefined;
            requestId: any;
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
            user_id: null;
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
            user_sequence: number | undefined;
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
            user_sequence: number | undefined;
            user_invite_code: string | undefined;
        };
    }>;
    getAliyunAuthToken(): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: {
            authToken: any;
            requestId: string | undefined;
        };
    }>;
    loginWithAliyunSpToken(spToken: string): Promise<{
        success: boolean;
        message: string;
        code?: undefined;
        data?: undefined;
    } | {
        success: boolean;
        code: string;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: {
            user_id: null;
            phone_number: any;
            is_new_user: boolean;
            user_sequence?: undefined;
        };
        code?: undefined;
    } | {
        success: boolean;
        message: string;
        data: {
            user_id: string;
            phone_number: string;
            is_new_user: boolean;
            user_sequence: number | undefined;
        };
        code?: undefined;
    }>;
}
