import { InvitesService } from './invites.service';
export declare class InvitesController {
    private readonly invites;
    constructor(invites: InvitesService);
    stats(userId: string): Promise<{
        success: boolean;
        message: string;
        user_invite_code?: undefined;
        current_uses?: undefined;
        max_uses?: undefined;
        remaining_uses?: undefined;
        eligible_for_free_drink?: undefined;
        free_drink_claimed?: undefined;
        free_drinks_remaining?: undefined;
    } | {
        success: boolean;
        user_invite_code: string;
        current_uses: number;
        max_uses: number;
        remaining_uses: number;
        eligible_for_free_drink: boolean;
        free_drink_claimed: boolean;
        free_drinks_remaining: any;
        message?: undefined;
    }>;
    progress(userId: string): Promise<{
        success: boolean;
        message: string;
        invitations?: undefined;
        total_invitations?: undefined;
    } | {
        success: boolean;
        invitations: {
            phone_number: string;
            invited_at: string;
            masked_phone: string;
        }[];
        total_invitations: number;
        message?: undefined;
    }>;
    claim(body: {
        user_id: string;
    }): Promise<{
        success: boolean;
        message: string;
        free_order_id?: undefined;
    } | {
        success: boolean;
        message: string;
        free_order_id: string;
    }>;
    remaining(): Promise<{
        success: boolean;
        free_drinks_remaining: any;
        message: string;
    }>;
    getAllInviteCodes(): Promise<{
        success: boolean;
        data: {
            code: string;
            max_uses: number;
            current_uses: number;
            remaining_uses: number;
            created_at: Date;
            used_by: string;
            used_at: Date;
        }[];
        message?: undefined;
    } | {
        success: boolean;
        message: string;
        data?: undefined;
    }>;
    updateInviteCode(body: {
        code: string;
        max_uses: number;
    }): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: {
            code: string;
            max_uses: number;
            current_uses: number;
            remaining_uses: number;
        };
    }>;
    createInviteCode(body: {
        code: string;
        max_uses: number;
        description?: string;
    }): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: {
            code: string;
            max_uses: number;
            current_uses: number;
            remaining_uses: number;
            created_at: Date;
        };
    }>;
    batchUpdateInvites(): Promise<{
        success: boolean;
        message: string;
        data: {
            total_codes: number;
            updated_existing: number;
            total_available_uses: number;
            codes: {
                code: string;
                max_uses: number;
                current_uses: number;
                remaining_uses: number;
            }[];
        };
        error?: undefined;
    } | {
        success: boolean;
        message: string;
        error: string;
        data?: undefined;
    }>;
}
