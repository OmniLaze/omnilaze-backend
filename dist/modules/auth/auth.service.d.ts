import { PrismaService } from '../../db/prisma.service';
export declare class AuthService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    sendVerificationCode(phoneNumber: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: {
            dev_code: string;
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
}
